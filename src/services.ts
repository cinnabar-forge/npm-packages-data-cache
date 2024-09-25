import https from "https";
import nodeSqlite3WasmPkg from "node-sqlite3-wasm";
const { Database } = nodeSqlite3WasmPkg;
import { EventEmitter } from "events";
import packageNameRegex from "package-name-regex";

import { getDbPath } from "./database.js";
import { generateStaticSiteHtml } from "./list.js";
import { PackageInfo } from "./types.js";

const CACHE_TIME = 3600000;
const MINIMUM_UPDATE_INTERVAL = 3000;
const updateEmitter = new EventEmitter();

let htmlUpdateAwaited = true;

/**
 * Returns whether an HTML update is awaited
 */
export function getHtmlUpdateAwaited() {
  return htmlUpdateAwaited;
}

/**
 * Sets whether an HTML update is awaited
 * @param value
 */
export function setHtmlUpdateAwaited(value: boolean) {
  htmlUpdateAwaited = value;
}

/**
 * Fetches the latest version of a package from the npm registry
 * @param packageName
 * @param source
 */
export async function fetchNpmPackageVersion(
  packageName: string,
  source: string,
): Promise<string> {
  if (
    !packageName ||
    packageName.length > 214 ||
    !packageNameRegex.test(packageName)
  ) {
    throw new Error("Invalid package format");
  }
  console.log(`'${source}' requested package '${packageName}'...`);

  const db = new Database(getDbPath());

  try {
    const cachedVersion: nodeSqlite3WasmPkg.QueryResult | null = db.get(
      `SELECT version FROM npm_cache WHERE package_name = ? AND cached_at > ?`,
      [packageName, Date.now() - CACHE_TIME],
    );

    if (cachedVersion != null && cachedVersion.version != null) {
      console.log(`...cached info '${packageName}@${cachedVersion.version}'`);
      return cachedVersion.version as string;
    }

    const version = await new Promise<string>((resolve, reject) => {
      https
        .get(`https://registry.npmjs.org/${packageName}/latest`, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `Error fetching package version: ${response.statusCode}`,
              ),
            );
            return;
          }

          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            try {
              const parsedData = JSON.parse(data);
              console.log(
                `...fetched info '${packageName}@${parsedData.version}'`,
              );
              resolve(parsedData.version);
              setHtmlUpdateAwaited(true);
            } catch {
              reject(new Error("Error parsing JSON response"));
            }
          });
        })
        .on("error", (e) => {
          reject(new Error(`Error fetching package version: ${e.message}`));
        });
    });

    db.run(
      `INSERT OR REPLACE INTO npm_cache (package_name, version, cached_at) VALUES (?, ?, ?)`,
      [packageName, version, Date.now()],
    );

    return version;
  } catch (error) {
    console.error("Error fetching npm package version:", error);
    throw error;
  } finally {
    db.close();
  }
}

/**
 * Updates the oldest package in the cache
 * @param db
 */
async function updateOldestPackage(
  db: nodeSqlite3WasmPkg.Database,
): Promise<void> {
  try {
    const oldestPackage: nodeSqlite3WasmPkg.QueryResult | null = db.get(
      `SELECT package_name, cached_at FROM npm_cache ORDER BY cached_at ASC LIMIT 1`,
    );

    if (oldestPackage && oldestPackage.package_name) {
      const packageName = oldestPackage.package_name as string;
      const cachedAt = oldestPackage.cached_at as number;

      if (Date.now() - cachedAt > CACHE_TIME) {
        await fetchNpmPackageVersion(packageName, "updateOldestPackage");
      }
    }

    setTimeout(() => updateEmitter.emit("update"), MINIMUM_UPDATE_INTERVAL);
  } catch (error) {
    console.error("Error updating oldest package:", error);
    setTimeout(() => updateEmitter.emit("update"), MINIMUM_UPDATE_INTERVAL);
  }
}

/**
 * Starts the continuous update process
 */
export function startContinuousUpdates(): void {
  updateEmitter.on("update", () => {
    const db = new Database(getDbPath());
    updateOldestPackage(db).finally(() => db.close());
  });

  updateEmitter.emit("update");
}

/**
 *
 */
export function generateStaticSite(): void {
  console.log("Generating static site...");
  try {
    const db = new Database(getDbPath());
    const list = db.all(
      `SELECT package_name as package, version, cached_at as lastCheck FROM npm_cache ORDER BY package_name ASC;`,
    );

    generateStaticSiteHtml(list as PackageInfo[]);
    console.log("Static site generated successfully");
  } catch (error) {
    console.error("Error generating static site:", error);
  }
}

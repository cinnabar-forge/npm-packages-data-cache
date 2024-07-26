import https from "https";
import nodeSqlite3WasmPkg from "node-sqlite3-wasm";
const { Database } = nodeSqlite3WasmPkg;
import fs from "fs";
import os from "os";
import packageNameRegex from "package-name-regex";
import path from "path";

// Cache time in ms
const CACHE_TIME = 86400000;

/**
 * Fetches the latest version of a package from the npm registry
 * @param packageName
 */
export async function fetchNpmPackageVersion(
  packageName: string,
): Promise<string> {
  if (
    !packageName ||
    packageName.length > 214 ||
    !packageNameRegex.test(packageName)
  ) {
    throw new Error("Invalid package format");
  }
  console.log(`fetching info from npm registry on '${packageName}'...`);
  const homeDir = os.homedir();
  const dbDir = path.join(
    homeDir,
    ".cache",
    "cinnabar-forge",
    "npm-packages-data-cache",
  );
  fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, "npm_cache.sqlite");

  const db = new Database(dbPath);

  try {
    db.run(`CREATE TABLE IF NOT EXISTS npm_cache (
      package_name TEXT PRIMARY KEY,
      version TEXT,
      cached_at INTEGER
    )`);

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
            } catch (e) {
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

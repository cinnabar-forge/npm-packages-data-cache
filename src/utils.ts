import fs from "fs/promises";
import os from "os";
import path from "path";

/**
 * Get the path to the cache folder for the app
 */
export async function getAppCacheFolder() {
  const dbDir = path.resolve(
    os.homedir(),
    ".cache",
    "cinnabar-forge",
    "npm-packages-data-cache",
  );
  await fs.mkdir(dbDir, { recursive: true });
  return dbDir;
}

/**
 * Get the path to the config folder for the app
 */
export async function getAppConfigFolder() {
  const dbDir = path.resolve(
    os.homedir(),
    ".config",
    "cinnabar-forge",
    "npm-packages-data-cache",
  );
  await fs.mkdir(dbDir, { recursive: true });
  return dbDir;
}

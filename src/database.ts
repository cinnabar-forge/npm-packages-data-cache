import fs from "fs";
import migratta, { LastMigration } from "migratta";
import nodeSqlite3WasmPkg from "node-sqlite3-wasm";
import os from "os";
import path from "path";

import { CINNABAR_PROJECT_VERSION } from "./cinnabar.js";
const { Database } = nodeSqlite3WasmPkg;

/**
 * Returns the path to the SQLite database file
 */
export function getDbPath() {
  const dbDir = path.join(
    os.homedir(),
    ".cache",
    "cinnabar-forge",
    "npm-packages-data-cache",
  );
  fs.mkdirSync(dbDir, { recursive: true });
  return path.join(dbDir, "npm-packages-data-cache.sqlite");
}

/**
 * Initialize the database
 */
export function dbInit() {
  const db = new Database(getDbPath());

  const migrations = migratta();

  db.exec(migrations.getMigrationTableSqlCreateQuery());

  const latestRevision: LastMigration = (db.get(
    migrations.getMigrationRevisionSqlSelectQuery(),
  ) || {
    app_version: CINNABAR_PROJECT_VERSION,
    date_migrated: 0,
    latest_revision: -1,
  }) as LastMigration;

  migrations.createMigration();
  migrations.createTable("npm_cache", {
    cached_at: { type: "INTEGER" },
    package_name: { primaryKey: true, type: "TEXT" },
    requested_at: { type: "INTEGER" },
    version: { type: "TEXT" },
  });

  const queries = migrations.getMigrationsSqlQueries(latestRevision);
  console.log(queries);
  for (const query of queries) {
    db.run(query.query, query.args);
  }
}

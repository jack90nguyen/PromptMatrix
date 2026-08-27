/**
 * Manual migration flow for a database user without CREATEDB.
 *
 * `prisma migrate dev` needs a shadow database to diff against; our role cannot
 * create one (P3014). This script diffs the live database against the schema
 * instead, which needs no extra privileges, and still records a real entry in
 * `prisma/migrations` so `prisma migrate deploy` works in production.
 *
 *   node scripts/migrate-manual.mjs create <name>   # write the SQL, review it
 *   node scripts/migrate-manual.mjs apply <dir>     # run it, record it
 *
 * Caveat: the diff is derived from the live database, so a column *rename*
 * shows up as DROP + ADD, which loses data. Always read the SQL before apply.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "prisma/migrations";

function run(args, options = {}) {
  return execFileSync("npx", ["prisma", ...args], { encoding: "utf8", ...options });
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function timestamp() {
  return new Date().toISOString().replace(/\D/g, "").slice(0, 14);
}

function create(name) {
  if (!name) fail("Usage: node scripts/migrate-manual.mjs create <name>");

  const dir = join(MIGRATIONS_DIR, `${timestamp()}_${name.replace(/[^a-z0-9_]+/gi, "_")}`);
  const file = join(dir, "migration.sql");

  const sql = run([
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ]);

  if (sql.includes("This is an empty migration")) {
    fail("Nothing to migrate - the database already matches prisma/schema.prisma.");
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(file, sql);

  console.log(sql);
  console.log(`Written to ${file}`);
  console.log(`Review the SQL above, then:  npm run db:migrate:apply -- ${dir}`);
}

function apply(dir) {
  if (!dir) fail("Usage: node scripts/migrate-manual.mjs apply <dir>");

  const file = join(dir, "migration.sql");
  if (!existsSync(file)) fail(`Not found: ${file}`);

  console.log(readFileSync(file, "utf8"));
  run(["db", "execute", "--file", file], { stdio: "inherit" });
  run(["migrate", "resolve", "--applied", dir.replace(`${MIGRATIONS_DIR}/`, "")], {
    stdio: "inherit",
  });
  run(["migrate", "status"], { stdio: "inherit" });
}

const [command, argument] = process.argv.slice(2);
if (command === "create") create(argument);
else if (command === "apply") apply(argument);
else fail("Usage: node scripts/migrate-manual.mjs <create|apply> <arg>");

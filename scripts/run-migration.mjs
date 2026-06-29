import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const file = process.argv[2];
if (!file) { console.error("Usage: node scripts/run-migration.mjs <sql-file>"); process.exit(1); }

const sql = neon(url);
const query = readFileSync(resolve(file), "utf8").trim();

console.log("Running:", file);
console.log(query);
await sql(query);
console.log("Done.");

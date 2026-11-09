import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = fileURLToPath(new URL("../../../supabase/migrations", import.meta.url));

/** Valores del `check (<col> in (...))` llamado `constraint` en la migración `*<suffix>`. */
export function checkListFrom(suffix: string, constraint: string): string[] {
  const file = readdirSync(MIGRATIONS).find((f) => f.endsWith(suffix));
  if (!file) throw new Error(`no existe la migracion *${suffix}`);
  const sql = readFileSync(join(MIGRATIONS, file), "utf8");
  const m = sql.match(new RegExp(`${constraint}\\s+check\\s*\\(\\s*\\w+\\s+in\\s*\\(([^)]*)\\)`, "i"));
  if (!m) throw new Error(`no encontre el CHECK ${constraint} en ${file}`);
  return m[1].split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
}

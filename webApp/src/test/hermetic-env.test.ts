import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEPLOY_ENV_VARS } from "./hermetic-env";

// T-098 ronda 1 (B-1): la suite corre en el build de Netlify con las variables del sitio cargadas.
const ROOT = join(__dirname, "..", "..");
const RUNBOOK = readFileSync(join(ROOT, "..", "docs", "deploy-netlify.md"), "utf8");
const SCRIPT = readFileSync(join(ROOT, "scripts", "test-netlify-env.sh"), "utf8");

/** Las variables de la tabla «Variables de entorno» del runbook (filas `| \`NOMBRE\` |`). */
function runbookVars(): string[] {
  return [...RUNBOOK.matchAll(/^\| `([A-Z][A-Z0-9_]+)` \|/gm)].map((m) => m[1]);
}

describe("suite hermética respecto del entorno de deploy", () => {
  it("la tabla del runbook trae las variables esperadas (el parser no está leyendo vacío)", () => {
    expect(runbookVars()).toEqual(expect.arrayContaining(["SITE_URL", "CRON_SECRET", "SMTP_HOST"]));
  });

  it("toda variable del runbook se limpia antes de cada archivo de test", () => {
    const missing = runbookVars().filter((v) => !(DEPLOY_ENV_VARS as readonly string[]).includes(v));
    expect(missing).toEqual([]);
  });

  it("el script de guarda carga toda variable del runbook más las propias de Netlify", () => {
    for (const v of [...runbookVars(), "NETLIFY", "CONTEXT", "URL", "NODE_ENV"]) {
      expect(SCRIPT, v).toMatch(new RegExp(`^export ${v}=`, "m"));
    }
  });

  it("dentro de un test no queda nada del entorno de deploy (vale también bajo test:netlify-env)", () => {
    for (const v of DEPLOY_ENV_VARS.filter((name) => name !== "RATE_LIMIT_BACKEND")) {
      expect(process.env[v], v).toBeUndefined();
    }
    expect(process.env.RATE_LIMIT_BACKEND).toBe("memory");
    expect(process.env.NODE_ENV).toBe("test");
  });
});

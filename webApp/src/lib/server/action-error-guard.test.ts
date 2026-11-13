import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// D-120 (T-097): el estado de una Server Action nunca devuelve `err.message`; pasa por actionError().
const ROOT = join(__dirname, "..", "..");
const RAW_RETURN = /(?:return|error:)[^;\n]*\berr(?:or)?\s+instanceof\s+Error\s*\?\s*err(?:or)?\.message/;

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return actionFiles(path);
    return /actions\.ts$/.test(name) ? [path] : [];
  });
}

describe("Server Actions sin mensaje crudo del motor", () => {
  it.each(actionFiles(join(ROOT, "app")).map((p) => [relative(ROOT, p), p]))("%s", (_name, path) => {
    expect(readFileSync(path, "utf8")).not.toMatch(RAW_RETURN);
  });
});

import { describe, expect, it } from "vitest";
import { aspectosPlutonSchema, familiaDe } from "./aspectos-pluton";

const bien = { texto: "t".repeat(300), conjuncion: "c".repeat(100), fluido: "f".repeat(100), tenso: "x".repeat(100) };

describe("esquema de aspectos de Plutón", () => {
  it("acepta un registro parcial", () => {
    expect(aspectosPlutonSchema.safeParse({}).success).toBe(true);
    expect(aspectosPlutonSchema.safeParse({ luna: bien }).success).toBe(true);
  });

  it.each([
    ["Plutón consigo mismo", { pluton: bien }],
    ["un punto que no es planeta", { asc: bien }],
    ["una familia que falta", { luna: { ...bien, tenso: undefined } }],
    ["texto corto", { luna: { ...bien, texto: "t".repeat(279) } }],
    ["texto largo", { luna: { ...bien, texto: "t".repeat(601) } }],
    ["frase corta", { luna: { ...bien, fluido: "f".repeat(89) } }],
    ["frase larga", { luna: { ...bien, conjuncion: "c".repeat(261) } }],
    ["comillas dobles", { luna: { ...bien, tenso: `${"x".repeat(100)}"` } }],
    ["apóstrofo", { luna: { ...bien, texto: `${"t".repeat(300)}'` } }],
  ])("rechaza %s", (_caso, dato) => {
    expect(aspectosPlutonSchema.safeParse(dato).success).toBe(false);
  });
});

describe("familia del aspecto", () => {
  it.each([
    ["conjuncion", "conjuncion"],
    ["trigono", "fluido"],
    ["sextil", "fluido"],
    ["cuadratura", "tenso"],
    ["oposicion", "tenso"],
  ] as const)("%s es %s", (tipo, familia) => {
    expect(familiaDe(tipo)).toBe(familia);
  });
});

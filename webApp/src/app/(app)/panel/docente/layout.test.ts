import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";

const { getCurrentUser, hasSelfChart, redirect } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  hasSelfChart: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
}));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser }));
vi.mock("@/lib/server/natal-chart", () => ({ hasSelfChart }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/carta-natal/TeacherChartGate", () => ({ default: function TeacherChartGate() { return null; } }));

import TeacherPanelLayout from "./layout";
import TeacherChartGate from "@/components/carta-natal/TeacherChartGate";

const hijo = createElement("p", null, "panel");

beforeEach(() => {
  getCurrentUser.mockReset();
  hasSelfChart.mockReset();
});

describe("T-024 · bloqueo del panel docente", () => {
  it("una docente sin carta propia ve solo el formulario", async () => {
    getCurrentUser.mockResolvedValue({ id: "t", role: "teacher" });
    hasSelfChart.mockResolvedValue(false);
    const el = (await TeacherPanelLayout({ children: hijo })) as { type: unknown };
    expect(el.type).toBe(TeacherChartGate);
  });

  it("con carta propia entra al panel", async () => {
    getCurrentUser.mockResolvedValue({ id: "t", role: "teacher" });
    hasSelfChart.mockResolvedValue(true);
    const el = (await TeacherPanelLayout({ children: hijo })) as { props: { children: unknown } };
    expect(el.props.children).toBe(hijo);
  });

  it("quien no es docente sigue yendo a /panel sin consultar la carta", async () => {
    getCurrentUser.mockResolvedValue({ id: "a", role: "admin" });
    await expect(TeacherPanelLayout({ children: hijo })).rejects.toThrow("REDIRECT /panel");
    expect(hasSelfChart).not.toHaveBeenCalled();
  });
});

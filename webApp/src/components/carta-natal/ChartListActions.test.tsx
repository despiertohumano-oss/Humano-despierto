import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/(marketing)/carta-natal/actions", () => ({ borrarCarta: vi.fn(), marcarMiCarta: vi.fn() }));

import ChartListActions from "./ChartListActions";

const ID = "5f1c1f0e-6a52-4a44-9a37-0c3f7d2f9a10";

describe("ChartListActions", () => {
  it("una carta que no es la propia ofrece marcarla y avisa qué se publica", () => {
    const html = renderToStaticMarkup(<ChartListActions id={ID} isSelf={false} />);
    expect(html).toContain("Marcar como mi carta");
    expect(html).toContain("Borrar carta");
    expect(html).toContain(`value="${ID}"`);
    expect(html).toMatch(/signo solar, el lunar y el ascendente se muestran en tu perfil público de docente/);
  });

  it("la carta propia no ofrece marcarla de nuevo ni repite el aviso", () => {
    const html = renderToStaticMarkup(<ChartListActions id={ID} isSelf />);
    expect(html).not.toContain("Marcar como mi carta");
    expect(html).not.toContain("perfil público");
    expect(html).toContain("Borrar carta");
  });
});

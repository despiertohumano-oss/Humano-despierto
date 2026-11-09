import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryChain, type ChainCall } from "@/test/query-chain";

const { createClient, getPublicSupabaseClient } = vi.hoisted(() => ({ createClient: vi.fn(), getPublicSupabaseClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/server/supabase-public", () => ({ getPublicSupabaseClient }));
vi.mock("@/lib/server/uploads", () => ({ signPublicUploadUrls: vi.fn(), signUploadUrl: vi.fn() }));

import { getPostBySlug, getPublishedPosts, syncRelatedCourses } from "./diario";

const POST_ROW = {
  slug: "s", title: "T", excerpt: null, published_at: "2026-11-01", category: "tarot-arquetipos", cover_path: null,
  teacher: { full_name: "Sol", slug: "sol", glyph: null },
};

describe("Diario público (B3)", () => {
  beforeEach(() => getPublicSupabaseClient.mockReset());

  it("filtra por categoría solo si se la pide, y devuelve la etiqueta", async () => {
    const logs: ChainCall[][] = [];
    getPublicSupabaseClient.mockReturnValue({
      from: () => {
        const { chain, calls } = queryChain(() => ({ data: [POST_ROW], error: null }));
        logs.push(calls);
        return chain;
      },
    });
    const [p] = await getPublishedPosts("tarot-arquetipos");
    expect(logs[0]).toContainEqual({ method: "eq", args: ["category", "tarot-arquetipos"] });
    expect(p).toMatchObject({ category: "tarot-arquetipos", categoryLabel: "Tarot y arquetipos", coverPath: null });
    await getPublishedPosts();
    expect(logs[1].some((c) => c.method === "eq" && c.args[0] === "category")).toBe(false);
  });

  it("los cursos relacionados salen sin los nulos que deja RLS", async () => {
    getPublicSupabaseClient.mockReturnValue({
      from: () =>
        queryChain(() => ({
          data: { ...POST_ROW, body: "b", related: [{ course: { slug: "a", title: "Arcanos", title_em: "menores" } }, { course: null }] },
          error: null,
        })).chain,
    });
    const post = await getPostBySlug("s");
    expect(post?.relatedCourses).toEqual([{ slug: "a", title: "Arcanos", titleEm: "menores" }]);
  });
});

describe("syncRelatedCourses (B3)", () => {
  it("borra lo que sobra e inserta lo que falta, con la sesión", async () => {
    const del = vi.fn(() => ({ eq: () => ({ in: async () => ({ error: null }) }) }));
    const insert = vi.fn(async (_rows: unknown) => ({ error: null }));
    createClient.mockResolvedValue({
      from: () => ({
        select: () => ({ eq: async () => ({ data: [{ course_id: "a" }, { course_id: "b" }], error: null }) }),
        delete: del,
        insert,
      }),
    });
    expect(await syncRelatedCourses("p", ["b", "c"])).toEqual({ error: null });
    expect(del).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith([{ post_id: "p", course_id: "c" }]);
  });

  it("el rechazo del guard vuelve como código, sin lanzar", async () => {
    createClient.mockResolvedValue({
      from: () => ({
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
        insert: async () => ({ error: { code: "42501" } }),
      }),
    });
    expect(await syncRelatedCourses("p", ["x"])).toEqual({ error: "42501" });
  });
});

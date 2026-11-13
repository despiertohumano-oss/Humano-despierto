import { describe, expect, it, vi } from "vitest";

const { after } = vi.hoisted(() => ({ after: vi.fn() }));
vi.mock("next/server", () => ({ after }));

import { mailAfterResponse } from "./after-mail";

describe("mailAfterResponse (G-02)", () => {
  it("no corre el envío en el request: lo deja para after()", () => {
    after.mockReset();
    const send = vi.fn(async () => {});
    mailAfterResponse("mail_x_failed", send);
    expect(send).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("un fallo del envío queda en el log y no se propaga", async () => {
    after.mockReset();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mailAfterResponse("mail_x_failed", async () => {
      throw new Error("smtp caído");
    });
    const task = after.mock.calls[0][0] as () => Promise<void>;
    await expect(task()).resolves.toBeUndefined();
    expect(JSON.parse(String(spy.mock.calls[0][0]))).toMatchObject({ event: "mail_x_failed", level: "error" });
    spy.mockRestore();
  });
});

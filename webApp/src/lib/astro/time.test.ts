// webApp/src/lib/astro/time.test.ts
import { describe, expect, it } from "vitest";
import { formatOffset, isValidTimeZone, localToUtc, tzdbOffsetSeconds, utcFromOffset } from "./time";

const BA = "America/Argentina/Buenos_Aires";
const BA_LON = -58.38159;

function ok(date: string, time: string, timeZone: string, lon = BA_LON) {
  const r = localToUtc({ date, time, timeZone, lon }, null);
  if (r.kind !== "ok") throw new Error(`esperaba ok y vino ${r.kind}`);
  return r;
}

describe("lugar-y-hora.md §6 · offsets históricos", () => {
  it.each([
    ["1 · Buenos Aires, DST 1989", "1989-01-15", "12:00", BA, -7200, "1989-01-15T14:00:00.000Z"],
    ["2 · Buenos Aires, 1974", "1974-02-15", "12:00", BA, -7200, "1974-02-15T14:00:00.000Z"],
    ["5 · Mendoza 2008-12", "2008-12-15", "12:00", "America/Argentina/Mendoza", -10800, "2008-12-15T15:00:00.000Z"],
    ["5 · Buenos Aires 2008-12", "2008-12-15", "12:00", BA, -7200, "2008-12-15T14:00:00.000Z"],
    ["6 · Mendoza 2004-07", "2004-07-01", "12:00", "America/Argentina/Mendoza", -14400, "2004-07-01T16:00:00.000Z"],
    ["6 · Buenos Aires 2004-07", "2004-07-01", "12:00", BA, -10800, "2004-07-01T15:00:00.000Z"],
    ["7 · San Luis 2009", "2009-06-15", "12:00", "America/Argentina/San_Luis", -14400, "2009-06-15T16:00:00.000Z"],
    ["8 · Jujuy 1991", "1991-01-15", "12:00", "America/Argentina/Jujuy", -10800, "1991-01-15T15:00:00.000Z"],
    ["8 · Buenos Aires 1991", "1991-01-15", "12:00", BA, -7200, "1991-01-15T14:00:00.000Z"],
    ["9 · Buenos Aires 1999 (marca DST, mismo offset)", "1999-12-15", "12:00", BA, -10800, "1999-12-15T15:00:00.000Z"],
    ["10 · CMT 1910 (hora legal con segundos, NO es LMT)", "1910-05-25", "12:00", BA, -15408, "1910-05-25T16:16:48.000Z"],
    ["14 · Ciudad de México 2023, sin DST", "2023-06-15", "12:00", "America/Mexico_City", -21600, "2023-06-15T18:00:00.000Z"],
  ])("%s", (_n, date, time, tz, offset, utc) => {
    const r = ok(date, time, tz);
    expect(r.offsetSeconds).toBe(offset);
    expect(r.utc.toISOString()).toBe(utc);
    expect(r.source).toBe("tzdb");
  });
});

describe("lugar-y-hora.md §6 · horas ambiguas: se pregunta, nunca se elige", () => {
  it.each([
    ["3 · Buenos Aires 2008-03-15 23:30", "2008-03-15", "23:30", BA, -7200, "2008-03-16T01:30:00.000Z", -10800, "2008-03-16T02:30:00.000Z"],
    ["12 · Montevideo 2014-03-09 01:30", "2014-03-09", "01:30", "America/Montevideo", -7200, "2014-03-09T03:30:00.000Z", -10800, "2014-03-09T04:30:00.000Z"],
    ["13 · Santiago 2024-04-06 23:30", "2024-04-06", "23:30", "America/Santiago", -10800, "2024-04-07T02:30:00.000Z", -14400, "2024-04-07T03:30:00.000Z"],
    ["14 · Ciudad de México 2022-10-30 01:30", "2022-10-30", "01:30", "America/Mexico_City", -18000, "2022-10-30T06:30:00.000Z", -21600, "2022-10-30T07:30:00.000Z"],
  ])("%s", (_n, date, time, tz, offE, utcE, offL, utcL) => {
    const r = localToUtc({ date, time, timeZone: tz, lon: 0 }, null);
    expect(r.kind).toBe("ambigua");
    if (r.kind !== "ambigua") return;
    expect([r.earlier.offsetSeconds, r.earlier.utc.toISOString()]).toEqual([offE, utcE]);
    expect([r.later.offsetSeconds, r.later.utc.toISOString()]).toEqual([offL, utcL]);
    const elegida = localToUtc({ date, time, timeZone: tz, lon: 0 }, "later");
    expect(elegida.kind === "ok" && elegida.utc.toISOString()).toBe(utcL);
  });

  it("4 · Buenos Aires 2007-12-30 00:30 no existió: se informa, aunque venga una elección", () => {
    expect(localToUtc({ date: "2007-12-30", time: "00:30", timeZone: BA, lon: BA_LON }, null).kind).toBe("inexistente");
    expect(localToUtc({ date: "2007-12-30", time: "00:30", timeZone: BA, lon: BA_LON }, "later").kind).toBe("inexistente");
  });
});

describe("LMT (lugar-y-hora.md §5)", () => {
  it("11 · el tzdb da el LMT de la ciudad cabecera: −3:53:48", () => {
    expect(tzdbOffsetSeconds("1880-01-01", "12:00", BA)).toBe(-14028);
  });

  it("antes de la primera transición usa la hora media del LUGAR: Rosario (−60,64°) = −4:02:34", () => {
    const r = ok("1880-01-01", "12:00", BA, -60.64);
    expect(r.source).toBe("lmt");
    expect(r.offsetSeconds).toBe(-14554);
    expect(r.utc.toISOString()).toBe("1880-01-01T16:02:34.000Z");
  });

  it("una zona fija sin transiciones no es LMT", () => {
    const r = ok("1880-01-01", "12:00", "Etc/GMT+3", -60.64);
    expect(r.source).toBe("tzdb");
    expect(r.offsetSeconds).toBe(-10800);
  });
});

describe("entradas inválidas y utilidades", () => {
  it("zona inexistente y fecha imposible", () => {
    expect(localToUtc({ date: "1990-01-01", time: "12:00", timeZone: "Marte/Olympus", lon: 0 }, null).kind).toBe("zona-invalida");
    expect(localToUtc({ date: "2023-02-30", time: "12:00", timeZone: BA, lon: 0 }, null).kind).toBe("fecha-invalida");
    expect(isValidTimeZone(BA)).toBe(true);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("utcFromOffset y formatOffset", () => {
    expect(utcFromOffset("1990-06-15", "09:00", -10800).toISOString()).toBe("1990-06-15T12:00:00.000Z");
    expect(formatOffset(-10800)).toBe("UTC−3");
    expect(formatOffset(-12600)).toBe("UTC−3:30");
    expect(formatOffset(-15408)).toBe("UTC−4:16:48");
    expect(formatOffset(19800)).toBe("UTC+5:30");
    expect(formatOffset(0)).toBe("UTC+0");
  });
});

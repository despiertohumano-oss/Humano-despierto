import { describe, expect, it } from "vitest";
import { calendarDateToIso, hhmmToTime, isoToCalendarDate, timeToHhmm } from "./date-value";

describe("isoToCalendarDate / calendarDateToIso", () => {
  it("ida y vuelta", () => {
    const d = isoToCalendarDate("1990-06-05");
    expect(d && [d.year, d.month, d.day]).toEqual([1990, 6, 5]);
    expect(calendarDateToIso(d)).toBe("1990-06-05");
  });
  it.each(["", null, undefined, "05/06/1990", "1990-6-5", "1990-02-30x"])("%s no es fecha", (v) => {
    expect(isoToCalendarDate(v)).toBeNull();
  });
  it("vacío sin fecha", () => expect(calendarDateToIso(null)).toBe(""));
});

describe("hhmmToTime / timeToHhmm", () => {
  it.each(["00:00", "09:05", "23:59"])("%s ida y vuelta", (v) => expect(timeToHhmm(hhmmToTime(v))).toBe(v));
  it.each(["24:00", "12:60", "9:30", "", null])("%s no es hora", (v) => expect(hhmmToTime(v)).toBeNull());
  it("vacío sin hora", () => expect(timeToHhmm(null)).toBe(""));
});

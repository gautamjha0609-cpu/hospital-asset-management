import { describe, expect, it } from "vitest";
import { polygonCentroid, buildingSchema, roomSchema } from "@/lib/location";

describe("polygonCentroid", () => {
  it("returns average of vertices", () => {
    const c = polygonCentroid([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    expect(c.x).toBe(5);
    expect(c.y).toBe(5);
  });
  it("handles empty input", () => {
    expect(polygonCentroid([])).toEqual({ x: 0, y: 0 });
  });
});

describe("location schemas", () => {
  it("rejects a building with no name", () => {
    expect(() => buildingSchema.parse({ name: "", code: "X" })).toThrow();
  });
  it("rejects a room with < 3 polygon points", () => {
    expect(() =>
      roomSchema.parse({
        floorId: "f1",
        name: "R",
        code: "R",
        type: "ROOM",
        geometry: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
      })
    ).toThrow();
  });
});

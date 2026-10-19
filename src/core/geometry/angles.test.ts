import { describe, expect, it } from "vitest";
import { angleAt, angleFromVertical, midpoint } from "./angles";

const p = (x: number, y: number, z = 0) => ({ x, y, z });

describe("angleAt", () => {
  it("measures a right angle", () => {
    expect(angleAt(p(1, 0), p(0, 0), p(0, 1))).toBeCloseTo(90);
  });

  it("measures a straight line as 180°", () => {
    expect(angleAt(p(-1, 0), p(0, 0), p(1, 0))).toBeCloseTo(180);
  });

  it("works in 3D", () => {
    expect(angleAt(p(1, 0, 0), p(0, 0, 0), p(0, 0, 1))).toBeCloseTo(90);
  });

  it("returns 0 for a degenerate segment instead of NaN", () => {
    expect(angleAt(p(0, 0), p(0, 0), p(1, 1))).toBe(0);
  });

  it("does not return NaN for collinear points with rounding error", () => {
    const angle = angleAt(p(0.1, 0.1), p(0.2, 0.2), p(0.3, 0.3));
    expect(Number.isNaN(angle)).toBe(false);
  });
});

describe("angleFromVertical", () => {
  it("is 0 for an upright segment regardless of y direction", () => {
    expect(angleFromVertical(p(0, 0), p(0, -1))).toBeCloseTo(0);
    expect(angleFromVertical(p(0, 0), p(0, 1))).toBeCloseTo(0);
  });

  it("is 45° for a diagonal and 90° for a horizontal segment", () => {
    expect(angleFromVertical(p(0, 0), p(1, 1))).toBeCloseTo(45);
    expect(angleFromVertical(p(0, 0), p(1, 0))).toBeCloseTo(90);
  });
});

describe("midpoint", () => {
  it("averages each axis", () => {
    expect(midpoint(p(0, 0, 0), p(2, 4, 6))).toEqual(p(1, 2, 3));
  });
});

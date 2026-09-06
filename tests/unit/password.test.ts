import { describe, expect, it } from "vitest";
import { validatePassword } from "@/lib/password";
import { hashToken, newRawToken } from "@/lib/reset-token";

describe("validatePassword", () => {
  it("rejects short passwords", () => {
    expect(validatePassword("short7!")).toMatch(/at least 8/i);
  });
  it("requires a letter and a digit", () => {
    expect(validatePassword("12345678")).toMatch(/letter/i);
    expect(validatePassword("abcdefgh")).toMatch(/number/i);
  });
  it("accepts a real password", () => {
    expect(validatePassword("Str0ngPass")).toBeNull();
  });
  it("rejects absurdly long", () => {
    expect(validatePassword("a1".repeat(200))).toMatch(/too long/i);
  });
});

describe("reset token", () => {
  it("returns different tokens each time", () => {
    const a = newRawToken();
    const b = newRawToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(30);
  });
  it("hashes deterministically", () => {
    const t = "the-quick-brown-fox";
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toHaveLength(64); // sha256 hex
  });
});

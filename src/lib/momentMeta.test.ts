import { describe, it, expect } from "vitest";
import { cleanMomentMeta } from "./momentMeta";
describe("cleanMomentMeta", () => {
  it("cuts titles to 80 characters", () => expect(cleanMomentMeta({ title: "a".repeat(100), emojis: ["🌅"] })?.title).toHaveLength(80));
  it("keeps only emoji entries", () => expect(cleanMomentMeta({ title: "Picnic", emojis: ["🌅", "sun", "7", "🧺"] })?.emojis).toEqual(["🌅", "🧺"]));
  it("keeps at most 3 emojis", () => expect(cleanMomentMeta({ title: "x", emojis: ["😀", "🌅", "🧺", "🎉"] })?.emojis).toHaveLength(3));
  it("rejects a reply with no emojis", () => expect(cleanMomentMeta({ title: "x", emojis: ["hi"] })).toBeNull());
  it("capitalizes the first letter of the title", () => expect(cleanMomentMeta({ title: "sunday pancakes", emojis: ["🥞"] })?.title).toBe("Sunday pancakes"));
});

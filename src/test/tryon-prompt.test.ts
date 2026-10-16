import { describe, expect, it } from "vitest";
import { buildTryOnPrompt } from "../../supabase/functions/generate-tryon/prompt";

describe("virtual try-on editing prompt", () => {
  it("instructs the editor to keep facial features and non-clothing details unchanged", () => {
    const prompt = buildTryOnPrompt([{ name: "Jacket" }], "M");

    expect(prompt).toContain("ONLY PERMITTED CHANGE");
    expect(prompt).toContain("Keep the exact face and identity");
    expect(prompt).toContain("facial geometry, eyes, eyebrows, nose, lips");
    expect(prompt).toContain("hands and fingers, pose, gaze");
    expect(prompt).toContain("every background object exactly as they are");
    expect(prompt).toContain("indistinguishable from the input outside the garment areas");
  });

  it("maps outfit descriptions and image references in the supplied order", () => {
    const prompt = buildTryOnPrompt([
      { name: "Wool coat", brand: "North", category: "outerwear", color: "navy", referenceIndex: 1, buttoned: true },
      { name: "Jeans", category: "bottomwear", referenceIndex: null, tucked: false },
    ], "L");

    expect(prompt).toContain("Target fit: relaxed with natural ease (L)");
    expect(prompt).toContain("1. North, Wool coat, category: outerwear, requested color: navy; match garment reference image 1; styling: buttoned up");
    expect(prompt).toContain("2. Jeans, category: bottomwear; no garment photo reference supplied; styling: untucked");
  });
});
import { supabase } from "@/integrations/supabase/client";

export type ProductData = {
  name: string;
  brand: string | null;
  price: string | null;
  image_url: string | null;
  category: "topwear" | "bottomwear" | "outerwear" | "footwear" | "accessory" | null;
  colors: string[];
  sizes: string[];
  size_chart: Record<string, Record<string, number>>;
};

export async function scrapeAndParseProduct(url: string): Promise<ProductData> {
  // Step 1: Scrape
  const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke("scrape-product", {
    body: { url },
  });

  if (scrapeError) throw new Error(scrapeError.message || "Scrape failed");
  if (!scrapeData?.success && scrapeData?.error) throw new Error(scrapeData.error);

  const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";
  if (!markdown) throw new Error("No content scraped from page");

  // Step 2: AI parse
  const { data: parseData, error: parseError } = await supabase.functions.invoke("parse-product", {
    body: { scrapedContent: markdown, productUrl: url },
  });

  if (parseError) throw new Error(parseError.message || "Parse failed");
  if (!parseData?.success) throw new Error(parseData?.error || "AI parsing failed");

  return {
    name: parseData.data.name || "Unknown Product",
    brand: parseData.data.brand || null,
    price: parseData.data.price || null,
    image_url: parseData.data.image_url || null,
    category: parseData.data.category || null,
    colors: parseData.data.colors || [],
    sizes: parseData.data.sizes || [],
    size_chart: parseData.data.size_chart || {},
  };
}

export function calculateFitScore(
  userMeasurements: { chest?: number; waist?: number; hips?: number; height?: number },
  sizeChart: Record<string, number>,
  fitPreference: string = "regular"
): { overall: number; chest: number; waist: number; length: number; returnRisk: "Low" | "Medium" | "High" } {
  const fitOffset = fitPreference === "tight" ? -1 : fitPreference === "relaxed" ? 2 : 0;

  const calcFit = (userVal: number | undefined, garmentVal: number | undefined): number => {
    if (!userVal || !garmentVal) return 75;
    const diff = Math.abs(garmentVal + fitOffset - userVal);
    if (diff <= 1) return 95;
    if (diff <= 2) return 85;
    if (diff <= 3) return 70;
    if (diff <= 5) return 50;
    return 30;
  };

  const chestFit = calcFit(userMeasurements.chest, sizeChart.chest);
  const waistFit = calcFit(userMeasurements.waist, sizeChart.waist);
  const lengthFit = calcFit(userMeasurements.height, sizeChart.length);

  const overall = Math.round((chestFit + waistFit + lengthFit) / 3);
  const returnRisk = overall >= 80 ? "Low" : overall >= 60 ? "Medium" : "High";

  return { overall, chest: chestFit, waist: waistFit, length: lengthFit, returnRisk };
}

export function recommendSize(
  userMeasurements: { chest?: number; waist?: number; hips?: number; height?: number },
  sizeChart: Record<string, Record<string, number>>,
  fitPreference: string = "regular"
): { size: string; confidence: number } | null {
  if (!sizeChart || Object.keys(sizeChart).length === 0) return null;

  let bestSize = "";
  let bestScore = 0;

  for (const [size, measurements] of Object.entries(sizeChart)) {
    const score = calculateFitScore(userMeasurements, measurements, fitPreference);
    if (score.overall > bestScore) {
      bestScore = score.overall;
      bestSize = size;
    }
  }

  if (!bestSize) return null;
  return { size: bestSize, confidence: bestScore };
}

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_closet_items",
  title: "List closet items",
  description: "List the signed-in user's saved clothing items, newest first. Optionally filter by category.",
  inputSchema: {
    category: z
      .enum(["topwear", "bottomwear", "outerwear", "footwear", "accessory"])
      .optional()
      .describe("Only return items in this category."),
    limit: z.number().int().min(1).max(100).default(25).describe("Maximum items to return."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("clothing_items")
      .select("id,name,brand,category,price,selected_color,selected_size,colors,sizes,image_url,product_url,fit_score,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { items: data ?? [] },
    };
  },
});

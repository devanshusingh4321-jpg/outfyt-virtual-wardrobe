import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_closet_item",
  title: "Add closet item",
  description: "Save a clothing item to the signed-in user's virtual closet.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Product name."),
    brand: z.string().trim().optional().describe("Brand name."),
    category: z
      .enum(["topwear", "bottomwear", "outerwear", "footwear", "accessory"])
      .describe("Clothing category."),
    price: z.string().trim().optional().describe("Price with currency symbol, e.g. \"$49\"."),
    image_url: z.string().url().optional().describe("Product image URL."),
    product_url: z.string().url().optional().describe("Retailer product page URL."),
    selected_color: z.string().trim().optional().describe("Chosen color."),
    selected_size: z.string().trim().optional().describe("Chosen size, e.g. \"M\"."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("clothing_items")
      .insert({ ...input, user_id: ctx.getUserId() })
      .select("id,name,brand,category,selected_size,selected_color")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Added "${data.name}" to the closet (id ${data.id}).` }],
      structuredContent: { item: data },
    };
  },
});

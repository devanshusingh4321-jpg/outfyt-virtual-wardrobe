import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_outfit",
  title: "Create outfit",
  description:
    "Create a named outfit for the signed-in user from existing closet item ids, layered in the given order.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Outfit name."),
    clothing_item_ids: z
      .array(z.string().uuid())
      .min(1)
      .max(12)
      .describe("Closet item ids, ordered from innermost to outermost layer."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, clothing_item_ids }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: outfit, error } = await supabase
      .from("outfits")
      .insert({ name, user_id: ctx.getUserId() })
      .select("id,name")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = clothing_item_ids.map((clothing_item_id, index) => ({
      outfit_id: outfit.id,
      clothing_item_id,
      layer_order: index,
    }));
    const { error: itemsError } = await supabase.from("outfit_items").insert(rows);
    if (itemsError) {
      return { content: [{ type: "text", text: itemsError.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Created outfit "${outfit.name}" (id ${outfit.id}) with ${rows.length} items.` }],
      structuredContent: { outfit, item_count: rows.length },
    };
  },
});

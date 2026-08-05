import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_outfits",
  title: "List outfits",
  description: "List the signed-in user's saved outfits with their layered clothing items.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum outfits to return."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("outfits")
      .select(
        "id,name,created_at,outfit_items(layer_order,clothing_items(id,name,brand,category,selected_color,selected_size,image_url))",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { outfits: data ?? [] },
    };
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_try_ons",
  title: "List virtual try-ons",
  description: "List the signed-in user's saved virtual try-on images, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum try-ons to return."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("try_ons")
      .select("id,outfit_id,outfit_name,size,image_url,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { try_ons: data ?? [] },
    };
  },
});

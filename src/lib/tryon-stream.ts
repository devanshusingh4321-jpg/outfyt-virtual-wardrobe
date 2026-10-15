import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

type TryOnResult = { success: true; imageUrl: string; imagePath: string };
type TryOnEvent = { type?: string; error?: { message?: string }; success?: boolean; imageUrl?: string; imagePath?: string; phase?: string };

export async function generateTryOnStream(
  body: Record<string, unknown>,
  onPreview: (imageUrl: string) => void,
  onPhase: (phase: string) => void,
): Promise<TryOnResult> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) throw new Error("Please sign in again before generating a try-on.");
  if (!baseUrl || !publishableKey) throw new Error("Try-on generation is not configured yet.");

  const response = await fetch(`${baseUrl}/functions/v1/generate-tryon`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const failure = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(failure?.error || "The try-on could not be generated. Please try again.");
  }

  const state: { result?: TryOnResult } = {};
  let streamError: string | null = null;
  const parser = createParser({
    onEvent(event) {
      let payload: TryOnEvent;
      try {
        payload = JSON.parse(event.data) as TryOnEvent;
      } catch {
        streamError = "The try-on returned an unreadable response. Please try again.";
        return;
      }

      if (event.event === "error" || payload.type === "error") {
        streamError = payload.error?.message || "The try-on could not be completed. Please try again.";
        return;
      }

      if (event.event === "tryon.preview" && typeof payload.imageUrl === "string") {
        onPreview(payload.imageUrl);
        return;
      }

      if (event.event === "tryon.status" && typeof payload.phase === "string") {
        onPhase(payload.phase);
        return;
      }

      if (event.event === "tryon.completed" && payload.success === true && payload.imageUrl && payload.imagePath) {
        state.result = { success: true, imageUrl: payload.imageUrl, imagePath: payload.imagePath };
      }
    },
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      parser.feed(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  if (streamError) throw new Error(streamError);
  if (!state.result) throw new Error("The try-on ended before the finished preview was ready. Please try again.");
  return state.result;
}
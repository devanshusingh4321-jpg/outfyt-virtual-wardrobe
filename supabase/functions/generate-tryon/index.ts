import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders as supabaseCorsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const corsHeaders = {
  ...supabaseCorsHeaders,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const gatewayUrl = 'https://ai.gateway.lovable.dev/v1';
const imageModel = 'openai/gpt-image-2.5-sunburst';
const allowedSizes = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
const allowedCategories = new Set(['topwear', 'bottomwear', 'outerwear', 'footwear', 'accessory']);
const maxInputBytes = 12 * 1024 * 1024;

type OutfitItem = {
  name: string;
  brand?: string | null;
  image_url?: string | null;
  category?: string | null;
  color?: string | null;
  buttoned?: boolean;
  tucked?: boolean;
};

type PhotoAsset = { bytes: Uint8Array; mimeType: string };

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), { status, headers: jsonHeaders });
}

function safeText(value: unknown, maxLength = 160): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
  return result || null;
}

function isAllowedImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

async function fetchImage(url: string, maxBytes = 8 * 1024 * 1024): Promise<PhotoAsset> {
  const response = await fetch(url, { redirect: 'error' });
  if (!response.ok) throw new Error('An outfit or photo image could not be loaded. Please retry the upload.');
  const mimeType = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new Error('Try-on photos and clothing images must be JPEG, PNG, or WebP.');
  }
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > maxBytes) throw new Error('An image is too large to use for this try-on.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) throw new Error('An image is empty or too large to use for this try-on.');
  return { bytes, mimeType };
}

function makeImageFile(asset: PhotoAsset, filename: string): File {
  return new File([asset.bytes], filename, { type: asset.mimeType });
}

async function createPrivateResult(supabase: ReturnType<typeof createClient>, userId: string, bytes: Uint8Array) {
  const path = `${userId}/tryon-result-${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage.from('tryon-photos').upload(path, bytes, {
    contentType: 'image/png',
    upsert: false,
  });
  if (uploadError) throw new Error('The try-on was generated, but it could not be saved securely. Please retry.');

  const { data, error } = await supabase.storage.from('tryon-photos').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    await supabase.storage.from('tryon-photos').remove([path]);
    throw new Error('The try-on was generated, but its private preview could not be opened. Please retry.');
  }
  return { path, signedUrl: data.signedUrl };
}

function tryonPrompt(items: OutfitItem[], size: string) {
  const fit = size === 'XS' || size === 'S' ? 'close-fitting, but anatomically natural' : size === 'L' || size === 'XL' || size === 'XXL' ? 'relaxed with natural ease' : 'regular true-to-size';
  const descriptions = items.map((item, index) => {
    const details = [item.brand, item.name, item.category ? `category: ${item.category}` : null, item.color ? `requested color: ${item.color}` : null]
      .filter((part): part is string => Boolean(part));
    const styling = [item.buttoned === true ? 'buttoned up' : item.buttoned === false ? 'worn open' : null, item.tucked === true ? 'tucked in' : item.tucked === false ? 'untucked' : null]
      .filter((part): part is string => Boolean(part));
    return `${index + 1}. ${details.join(', ')}${styling.length ? `; styling: ${styling.join(', ')}` : ''}`;
  }).join('\n');

  return `Make a photorealistic virtual clothing try-on by EDITING the first input photograph, not by creating a new photograph.

IMAGE ROLES AND ORDER
- Image 1 is the source photograph of the person. It is the immutable base image and must remain the same person in the same photograph.
- Each following image, in order, is a garment reference for its correspondingly numbered outfit item below. Reference photos show clothing only; do not copy their model, face, body, pose, lighting, crop, or background.

ONLY PERMITTED CHANGE
Replace only the visible clothing worn by the person with these requested items. Use the garment references to faithfully match each item's design, color, pattern, material, collar, sleeves, length, and visible construction. Apply natural fabric folds, occlusion, and lighting consistent with the original source. Target fit: ${fit} (${size}). Respect only the listed styling settings.

LOCK THE SOURCE PHOTOGRAPH
Preserve every pixel outside the clothing edit as closely as possible. Do not retouch, regenerate, beautify, reinterpret, or restyle the person. Keep the exact face and identity: facial geometry, eyes, eyebrows, nose, lips, teeth, ears, skin texture, expression, makeup, and age. Keep hair and hairline, skin tone, body shape and proportions, hands and fingers, pose, gaze, accessories not covered by the new clothes, and all visible anatomy unchanged. Keep the original camera angle, framing, crop, perspective, focus, lighting, color grade, and every background object exactly as they are.

Do not change facial features or any non-clothing element. Do not add objects, people, jewelry, text, logos, or new accessories. Do not crop, expand, mirror, or change the aspect ratio. If a garment is difficult to render, keep the source photograph unchanged in that region rather than modifying the face, body, or background.

OUTFIT TO APPLY
${descriptions}

Return one high-quality photorealistic edit of the original source photo. The result should be indistinguishable from the input outside the garment areas.`;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonError('Method not allowed.', 405);
  if (Number(request.headers.get('content-length') || 0) > 24 * 1024 * 1024) return jsonError('The try-on request is too large.', 413);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!supabaseUrl || !serviceRoleKey || !apiKey) {
      console.error('Try-on generation is missing required server configuration.');
      return jsonError('Try-on generation is not configured yet.', 503);
    }

    const authorization = request.headers.get('Authorization');
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) return jsonError('Please sign in to continue.', 401);
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    if (authError || !user) return jsonError('Please sign in to continue.', 401);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonError('The try-on request is not valid.', 400);
    }
    if (!payload || typeof payload !== 'object' || !('photoUrl' in payload) || !('outfitItems' in payload) || !('size' in payload)) {
      return jsonError('A photo, outfit, and size are required.', 400);
    }
    const body = payload as { photoUrl: unknown; outfitItems: unknown; size: unknown };
    if (!isAllowedImageUrl(body.photoUrl)) return jsonError('Please upload a valid try-on photo.', 400);
    if (!Array.isArray(body.outfitItems) || body.outfitItems.length < 1 || body.outfitItems.length > 8) {
      return jsonError('Choose an outfit with between one and eight items.', 400);
    }
    if (typeof body.size !== 'string' || !allowedSizes.has(body.size)) return jsonError('Choose a valid size before generating your try-on.', 400);

    const items: OutfitItem[] = [];
    for (const value of body.outfitItems) {
      if (!value || typeof value !== 'object' || !('name' in value)) return jsonError('One of the outfit items is not valid.', 400);
      const item = value as Record<string, unknown>;
      const name = safeText(item.name, 120);
      if (!name) return jsonError('Each outfit item needs a name.', 400);
      const category = safeText(item.category, 40);
      if (category && !allowedCategories.has(category.toLowerCase())) return jsonError('One of the outfit categories is not supported.', 400);
      if (item.image_url !== null && item.image_url !== undefined && !isAllowedImageUrl(item.image_url)) {
        return jsonError('One of the outfit images is not a valid secure image link.', 400);
      }
      items.push({
        name,
        brand: safeText(item.brand, 80),
        category: category?.toLowerCase() ?? null,
        color: safeText(item.color, 60),
        image_url: typeof item.image_url === 'string' ? item.image_url : null,
        ...(typeof item.buttoned === 'boolean' ? { buttoned: item.buttoned } : {}),
        ...(typeof item.tucked === 'boolean' ? { tucked: item.tucked } : {}),
      });
    }

    const [sourcePhoto, garmentImages] = await Promise.all([
      fetchImage(body.photoUrl),
      Promise.all(items.map((item) => item.image_url ? fetchImage(item.image_url, 4 * 1024 * 1024) : Promise.resolve(null))),
    ]);
    const inputSize = sourcePhoto.bytes.byteLength + garmentImages.reduce((sum, image) => sum + (image?.bytes.byteLength ?? 0), 0);
    if (inputSize > maxInputBytes) return jsonError('The selected photos are too large. Choose smaller images and try again.', 413);

    const form = new FormData();
    form.set('model', imageModel);
    form.set('prompt', tryonPrompt(items, body.size));
    form.set('quality', 'max');
    form.set('size', 'auto');
    form.set('output_format', 'png');
    form.set('stream', 'true');
    form.set('partial_images', '1');
    form.append('image[]', makeImageFile(sourcePhoto, 'source-person.png'));
    garmentImages.forEach((image, index) => {
      if (image) form.append('image[]', makeImageFile(image, `garment-reference-${index + 1}.png`));
    });

    const upstream = await fetch(`${gatewayUrl}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!upstream.ok || !upstream.body) {
      const upstreamText = await upstream.text().catch(() => '');
      console.error(`Try-on image edit failed [${upstream.status}]: ${upstreamText.slice(0, 1200)}`);
      let userMessage = 'The try-on image could not be created. Please try again.';
      if (upstream.status === 402) userMessage = 'AI image credits are exhausted. Add credits to continue generating try-ons.';
      else if (upstream.status === 429) userMessage = 'Try-on generation is busy right now. Please wait a moment and try again.';
      else if (upstream.status === 400) userMessage = 'The uploaded photos could not be edited. Try a clear JPG or PNG photo.';
      else if (upstream.status === 403) userMessage = 'Try-on image editing is temporarily unavailable for this workspace.';
      return jsonError(userMessage, upstream.status >= 400 && upstream.status <= 599 ? upstream.status : 502);
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const upstreamReader = upstream.body.getReader();
    let eventBuffer = '';
    let imageBytes: Uint8Array | null = null;
    let terminalError: string | null = null;
    let gotCompletedEvent = false;
    let totalImageBytes = 0;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (name: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        const processEvent = async (eventBlock: string) => {
          let eventName = '';
          const dataLines: string[] = [];
          for (const line of eventBlock.split(/\r?\n/)) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
          }
          if (!dataLines.length) return;

          let eventData: Record<string, unknown>;
          try {
            eventData = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
          } catch {
            return;
          }
          const eventType = eventName || (typeof eventData.type === 'string' ? eventData.type : '');
          if (eventType === 'error' || eventData.type === 'error') {
            const error = eventData.error;
            terminalError = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
              ? error.message
              : 'The try-on image could not be created. Please try again.';
            return;
          }

          if (eventType !== 'image_edit.partial_image' && eventType !== 'image_edit.completed') return;
          if (typeof eventData.b64_json !== 'string') {
            terminalError = 'The try-on returned an incomplete image. Please try again.';
            return;
          }
          const binary = atob(eventData.b64_json);
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          totalImageBytes += bytes.byteLength;
          if (totalImageBytes > 24 * 1024 * 1024) {
            terminalError = 'The generated try-on is too large to save. Please try again.';
            return;
          }

          if (eventType === 'image_edit.completed') {
            imageBytes = bytes;
            gotCompletedEvent = true;
            sendEvent('tryon.status', { phase: 'saving' });
            try {
              const saved = await createPrivateResult(supabase, user.id, bytes);
              sendEvent('tryon.completed', { success: true, imageUrl: saved.signedUrl, imagePath: saved.path });
            } catch (error) {
              terminalError = error instanceof Error ? error.message : 'The preview could not be saved securely.';
              sendEvent('error', { error: { message: terminalError } });
            }
            return;
          }

          sendEvent('tryon.preview', { imageUrl: `data:image/png;base64,${eventData.b64_json}` });
        };

        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;
            eventBuffer += decoder.decode(value, { stream: true });
            const blocks = eventBuffer.split(/\r?\n\r?\n/);
            eventBuffer = blocks.pop() ?? '';
            for (const block of blocks) await processEvent(block);
          }
          eventBuffer += decoder.decode();
          if (eventBuffer.trim()) await processEvent(eventBuffer);
          if (!terminalError && !gotCompletedEvent) {
            terminalError = 'The image editor ended before the try-on was complete. Please try again.';
            sendEvent('error', { error: { message: terminalError } });
          }
        } catch (error) {
          console.error('Try-on image stream failed:', error instanceof Error ? error.message : 'Unknown streaming error');
          sendEvent('error', { error: { message: 'The try-on was interrupted before it finished. Please try again.' } });
        } finally {
          upstreamReader.releaseLock();
          controller.close();
        }
      },
      cancel() {
        void upstreamReader.cancel().catch(() => {});
      },
    });

    void imageBytes;
    void terminalError;
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Try-on generation failed. Please try again.';
    console.error('Try-on generation failed:', message);
    const status = message.includes('too large') ? 413 : 500;
    return jsonError(status === 413 ? message : 'Try-on generation failed. Please try again.', status);
  }
});
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders as supabaseCorsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { editImage } from './gateway.ts';
import { buildTryOnPrompt, type TryOnGarment } from './prompt.ts';

const corsHeaders = {
  ...supabaseCorsHeaders,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const allowedSizes = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
const allowedCategories = new Set(['topwear', 'bottomwear', 'outerwear', 'footwear', 'accessory']);
const maxInputBytes = 12 * 1024 * 1024;

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
    const hostname = url.hostname.toLowerCase();
    const isIpv4Literal = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
    const isLocalHostname = hostname === 'localhost'
      || hostname.endsWith('.localhost')
      || hostname.endsWith('.local')
      || hostname.endsWith('.internal')
      || hostname.endsWith('.test');
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && !hostname.startsWith('[')
      && !isIpv4Literal
      && !isLocalHostname;
  } catch {
    return false;
  }
}

function isUserPhotoUrl(value: string, supabaseUrl: string, userId: string) {
  try {
    const photo = new URL(value);
    const project = new URL(supabaseUrl);
    const objectPrefix = `/storage/v1/object/sign/tryon-photos/${userId}/`;
    return photo.origin === project.origin && photo.pathname.startsWith(objectPrefix);
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
  const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType === 'image/webp' ? 'webp' : 'png';
  return new File([asset.bytes], `${filename}.${extension}`, { type: asset.mimeType });
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
    if (!isAllowedImageUrl(body.photoUrl) || !isUserPhotoUrl(body.photoUrl, supabaseUrl, user.id)) return jsonError('Please upload a valid try-on photo.', 400);
    if (!Array.isArray(body.outfitItems) || body.outfitItems.length < 1 || body.outfitItems.length > 8) {
      return jsonError('Choose an outfit with between one and eight items.', 400);
    }
    if (typeof body.size !== 'string' || !allowedSizes.has(body.size)) return jsonError('Choose a valid size before generating your try-on.', 400);

    const items: TryOnGarment[] = [];
    const garmentUrls: (string | null)[] = [];
    let nextReferenceIndex = 1;
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
      const hasReference = typeof item.image_url === 'string';
      items.push({
        name,
        brand: safeText(item.brand, 80),
        category: category?.toLowerCase() ?? null,
        color: safeText(item.color, 60),
        referenceIndex: hasReference ? nextReferenceIndex++ : null,
        ...(typeof item.buttoned === 'boolean' ? { buttoned: item.buttoned } : {}),
        ...(typeof item.tucked === 'boolean' ? { tucked: item.tucked } : {}),
      });
      garmentUrls.push(typeof item.image_url === 'string' ? item.image_url : null);
    }

    const [sourcePhoto, garmentImages] = await Promise.all([
      fetchImage(body.photoUrl),
      Promise.all(garmentUrls.map((url) => url ? fetchImage(url, 4 * 1024 * 1024) : Promise.resolve(null))),
    ]);
    const inputSize = sourcePhoto.bytes.byteLength + garmentImages.reduce((sum, image) => sum + (image?.bytes.byteLength ?? 0), 0);
    if (inputSize > maxInputBytes) return jsonError('The selected photos are too large. Choose smaller images and try again.', 413);

    const form = new FormData();
    form.set('prompt', buildTryOnPrompt(items, body.size));
    form.set('quality', 'max');
    form.set('size', 'auto');
    form.set('output_format', 'png');
    form.set('stream', 'true');
    form.set('partial_images', '1');
    form.append('image[]', makeImageFile(sourcePhoto, 'source-person'));
    garmentImages.forEach((image, index) => {
      if (image) form.append('image[]', makeImageFile(image, `garment-reference-${index + 1}`));
    });

    const upstream = await editImage(apiKey, form);
    if (!upstream.ok || !upstream.body) {
      const upstreamText = await upstream.text().catch(() => '');
      let upstreamMessage: string | null = null;
      try {
        const errorBody = JSON.parse(upstreamText) as { message?: unknown; error?: { message?: unknown } };
        upstreamMessage = safeText(errorBody.error?.message, 320) ?? safeText(errorBody.message, 320);
      } catch {
        upstreamMessage = null;
      }
      console.error(`Try-on image edit failed [${upstream.status}].`);
      let userMessage = 'The try-on image could not be created. Please try again.';
      if (upstream.status === 402) userMessage = upstreamMessage ?? 'AI image credits are exhausted. Add credits to continue generating try-ons.';
      else if (upstream.status === 429) userMessage = 'Try-on generation is busy right now. Please wait a moment and try again.';
      else if (upstream.status === 400) userMessage = 'The uploaded photos could not be edited. Try a clear JPG or PNG photo.';
      else if (upstream.status === 403) userMessage = upstreamMessage ?? 'Try-on image editing is not available for this workspace right now.';
      else if (upstream.status === 401) userMessage = 'Try-on image editing is not configured correctly. Please contact the app owner.';
      else if (upstream.status === 404) userMessage = 'The try-on image editor is temporarily unavailable.';
      else if (upstream.status >= 500) userMessage = upstreamMessage ?? 'The try-on image editor had a temporary problem. Please try again later.';
      return jsonError(userMessage, upstream.status >= 400 && upstream.status <= 599 ? upstream.status : 502);
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const upstreamReader = upstream.body.getReader();
    let eventBuffer = '';
    let terminalError: string | null = null;
    let gotCompletedEvent = false;
    let receivedImageEvent = false;
    let errorEventSent = false;

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
              ? safeText(error.message, 500) ?? 'The try-on image could not be created. Please try again.'
              : 'The try-on image could not be created. Please try again.';
            return;
          }

          if (eventType !== 'image_edit.partial_image' && eventType !== 'image_edit.completed') return;
          receivedImageEvent = true;
          if (typeof eventData.b64_json !== 'string') {
            terminalError = 'The try-on returned an incomplete image. Please try again.';
            return;
          }
          const binary = atob(eventData.b64_json);
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          if (bytes.byteLength > 24 * 1024 * 1024) {
            terminalError = 'The generated try-on is too large to save. Please try again.';
            return;
          }

          if (eventType === 'image_edit.completed') {
            gotCompletedEvent = true;
            sendEvent('tryon.status', { phase: 'saving' });
            try {
              const saved = await createPrivateResult(supabase, user.id, bytes);
              sendEvent('tryon.completed', { success: true, imageUrl: saved.signedUrl, imagePath: saved.path });
            } catch (error) {
              terminalError = error instanceof Error ? error.message : 'The preview could not be saved securely.';
            }
            return;
          }

          sendEvent('tryon.preview', { imageUrl: `data:image/png;base64,${eventData.b64_json}` });
        };

        try {
          while (true) {
            try {
              const { done, value } = await upstreamReader.read();
              if (done) break;
              eventBuffer += decoder.decode(value, { stream: true });
              const blocks = eventBuffer.split(/\r?\n\r?\n/);
              eventBuffer = blocks.pop() ?? '';
              for (const block of blocks) await processEvent(block);
            } catch (error) {
              if (!receivedImageEvent && !terminalError) break;
              throw error;
            }
          }
          eventBuffer += decoder.decode();
          if (eventBuffer.trim()) await processEvent(eventBuffer);
          if (terminalError) {
            sendEvent('error', { error: { message: terminalError } });
            errorEventSent = true;
          } else if (!gotCompletedEvent) {
            if (!receivedImageEvent) {
              const replayForm = new FormData();
              form.forEach((value, key) => replayForm.append(key, value));
              replayForm.set('stream', 'false');
              replayForm.delete('partial_images');
              const replayResponse = await editImage(apiKey, replayForm);
              if (!replayResponse.ok) {
                const replayText = await replayResponse.text().catch(() => '');
                let message = 'The try-on image could not be created. Please try again.';
                try {
                  const parsedError = JSON.parse(replayText) as { error?: { message?: unknown }; message?: unknown };
                  message = safeText(parsedError.error?.message, 500) ?? safeText(parsedError.message, 500) ?? message;
                } catch {
                  message = `The try-on image could not be created (error ${replayResponse.status}). Please try again.`;
                }
                console.error(`Try-on image edit fallback failed [${replayResponse.status}].`);
                sendEvent('error', { error: { message } });
                errorEventSent = true;
              } else {
                const replayData = await replayResponse.json() as { data?: Array<{ b64_json?: unknown }> };
                const finalBase64 = replayData.data?.[0]?.b64_json;
                if (typeof finalBase64 !== 'string') {
                  sendEvent('error', { error: { message: 'The image editor returned no finished try-on. Please try again.' } });
                  errorEventSent = true;
                } else {
                  const binary = atob(finalBase64);
                  const finalBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
                  if (finalBytes.byteLength > 24 * 1024 * 1024) {
                    sendEvent('error', { error: { message: 'The generated try-on is too large to save. Please try again.' } });
                    errorEventSent = true;
                  } else {
                    sendEvent('tryon.status', { phase: 'saving' });
                    const saved = await createPrivateResult(supabase, user.id, finalBytes);
                    sendEvent('tryon.completed', { success: true, imageUrl: saved.signedUrl, imagePath: saved.path });
                  }
                }
              }
            } else {
              sendEvent('error', { error: { message: 'The image editor ended before the try-on was complete. Please try again.' } });
              errorEventSent = true;
            }
          }
        } catch (error) {
          console.error('Try-on image stream failed:', error instanceof Error ? error.message : 'Unknown streaming error');
          if (!errorEventSent) {
            const message = terminalError ?? 'The try-on was interrupted before it finished. Please try again.';
            sendEvent('error', { error: { message } });
          }
        } finally {
          upstreamReader.releaseLock();
          controller.close();
        }
      },
      cancel() {
        void upstreamReader.cancel().catch(() => {});
      },
    });

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
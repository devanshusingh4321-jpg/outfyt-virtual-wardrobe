import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders as supabaseCorsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { assertImageEditModelAvailable, createTryOnImageStream, type TryOnEditRequest } from './sdk.ts';
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
  let currentUrl = url;
  let response: Response | null = null;
  for (let attempt = 0; attempt <= 3; attempt++) {
    response = await fetch(currentUrl, { redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location || attempt === 3) throw new Error('An outfit or photo image could not be loaded. Please retry the upload.');
    const nextUrl = new URL(location, currentUrl).toString();
    if (!isAllowedImageUrl(nextUrl)) throw new Error('An image link redirected to an unsupported address.');
    currentUrl = nextUrl;
  }
  if (!response) throw new Error('An outfit or photo image could not be loaded. Please retry the upload.');
  if (!response.ok) throw new Error('An outfit or photo image could not be loaded. Please retry the upload.');
  const mimeType = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new Error('Try-on photos and clothing images must be JPEG, PNG, or WebP.');
  }
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > maxBytes) throw new Error('An image is too large to use for this try-on.');
  if (!response.body) throw new Error('An outfit or photo image could not be loaded. Please retry the upload.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('An image is too large to use for this try-on.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (totalBytes === 0) throw new Error('An image is empty or too large to use for this try-on.');
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, mimeType };
}

function makeImageFile(asset: PhotoAsset, filename: string): File {
  const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType === 'image/webp' ? 'webp' : 'png';
  return new File([asset.bytes.slice().buffer], `${filename}.${extension}`, { type: asset.mimeType });
}

async function createPrivateResult(supabase: SupabaseClient<any, 'public', any, any, any>, userId: string, bytes: Uint8Array) {
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
    if (!supabaseUrl || !serviceRoleKey) {
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

    try {
      await assertImageEditModelAvailable();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not currently available')) {
        return jsonError(error.message, 503);
      }
      console.error('Could not confirm the workspace image editor catalog.');
      return jsonError('Try-on image editing is not available right now. Please try again later.', 503);
    }

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

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (name: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const imageFiles = [...form.getAll('image[]')].filter((entry): entry is File => entry instanceof File);
        if (imageFiles.length === 0) {
          sendEvent('error', { error: { message: 'A clear photo is required to create a try-on.' } });
          controller.close();
          return;
        }
        const editPayload: Omit<TryOnEditRequest, 'model' | 'stream'> = {
          prompt: String(form.get('prompt') ?? ''),
          image: imageFiles,
          quality: 'max',
          size: 'auto',
          output_format: 'png',
          partial_images: 1,
        };
        let completed = false;
        try {
          const imageFileParts = editPayload.image;
          const imageFiles = Array.isArray(imageFileParts) ? imageFileParts : [imageFileParts];
          for (let streamAttempt = 0; streamAttempt < 2 && !completed; streamAttempt++) {
            let receivedImageEvent = false;
            try {
              const generated = await createTryOnImageStream(editPayload);
              for await (const event of generated) {
                if (event.type === 'image_edit.partial_image') {
                  receivedImageEvent = true;
                  sendEvent('tryon.preview', { imageUrl: `data:image/png;base64,${event.b64_json}` });
                } else if (event.type === 'image_edit.completed') {
                  receivedImageEvent = true;
                  completed = true;
                  sendEvent('tryon.status', { phase: 'saving' });
                  const binary = atob(event.b64_json);
                  const imageBytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
                  if (imageBytes.byteLength > 24 * 1024 * 1024) {
                    throw new Error('The generated try-on is too large to save. Please try again.');
                  }
                  const saved = await createPrivateResult(supabase, user.id, imageBytes);
                  sendEvent('tryon.completed', { success: true, imageUrl: saved.signedUrl, imagePath: saved.path });
                }
              }
            } catch (error) {
              const isGatewayError = error instanceof Error && 'httpStatus' in error;
              const notStarted = isGatewayError && 'outcome' in error && error.outcome === 'not_started';
              if (!notStarted || receivedImageEvent || streamAttempt > 0) throw error;
              editPayload.image = imageFiles.map((file) => file.slice(0, file.size, file.type));
            }
            if (completed) break;
            if (receivedImageEvent || streamAttempt > 0) break;
          }
          if (!completed) throw new Error('The image editor ended before the try-on was complete. Please try again.');
        } catch (error) {
          const gatewayError = error instanceof Error ? error : new Error('Try-on generation failed. Please try again.');
          console.error(`Try-on image edit failed [${'httpStatus' in gatewayError ? gatewayError.httpStatus : 'unknown'}]: ${gatewayError.message}`);
          sendEvent('error', { error: { message: gatewayError.message } });
        } finally {
          controller.close();
        }
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
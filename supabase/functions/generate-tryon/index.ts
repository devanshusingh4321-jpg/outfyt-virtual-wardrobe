const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch image');
  const buf = await res.arrayBuffer();
  return { base64: arrayBufferToBase64(buf), mime: res.headers.get('content-type') || 'image/jpeg' };
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function callAI(apiKey: string, content: any[]): Promise<string | null> {
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-pro-image-preview',
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    console.error('AI error:', resp.status, errText);
    if (resp.status === 429 || resp.status === 402) throw new Error(`AI_${resp.status}`);
    throw new Error(`AI generation failed: ${resp.status}`);
  }
  const data = await resp.json();
  const images = data.choices?.[0]?.message?.images;
  if (images && images.length > 0) {
    const url = images[0]?.image_url?.url;
    if (url && url.startsWith('data:')) return url.split(',')[1] || null;
  }
  return null;
}

async function uploadImage(supabase: any, userId: string, b64: string, suffix: string): Promise<string | null> {
  const bytes = base64ToBytes(b64);
  const path = `${userId}/tryon-${suffix}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('tryon-photos').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) { console.error('Upload error:', error); return null; }
  const { data } = supabase.storage.from('tryon-photos').getPublicUrl(path);
  return data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { photoUrl, outfitItems, size } = await req.json();
    if (!photoUrl || !outfitItems || outfitItems.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Photo URL and outfit items are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch user photo
    const photo = await fetchImageAsBase64(photoUrl);

    // Build outfit description & fetch item images
    const itemDescriptions: string[] = [];
    const fetchPromises: Promise<{ base64: string; mime: string; name: string } | null>[] = [];

    for (const item of outfitItems) {
      const notes: string[] = [];
      if (item.buttoned === true) notes.push('buttoned up');
      if (item.buttoned === false) notes.push('unbuttoned/open');
      if (item.tucked === true) notes.push('tucked in');
      if (item.tucked === false) notes.push('untucked');

      const desc = [item.brand, item.name, item.category ? `(${item.category})` : '', item.color ? `in ${item.color}` : '', notes.length ? `— ${notes.join(', ')}` : ''].filter(Boolean).join(' ');
      itemDescriptions.push(desc);

      if (item.image_url) {
        fetchPromises.push(
          fetch(item.image_url).then(async r => r.ok ? { base64: arrayBufferToBase64(await r.arrayBuffer()), mime: r.headers.get('content-type') || 'image/jpeg', name: desc } : null).catch(() => null)
        );
      }
    }

    const itemImages = (await Promise.all(fetchPromises)).filter(Boolean) as { base64: string; mime: string; name: string }[];
    const fitStyle = size === 'XS' || size === 'S' ? 'tight/fitted' : size === 'L' || size === 'XL' || size === 'XXL' ? 'loose/relaxed' : 'regular true-to-size';

    console.log('Generating try-on, items:', itemImages.length, 'size:', size);

    // Build image content (person photo + item refs)
    const imageContent: any[] = [
      { type: 'image_url', image_url: { url: `data:${photo.mime};base64,${photo.base64}` } },
    ];
    for (let i = 0; i < itemImages.length; i++) {
      imageContent.push({ type: 'text', text: `Reference for item ${i + 1}: ${itemImages[i].name}` });
      imageContent.push({ type: 'image_url', image_url: { url: `data:${itemImages[i].mime};base64,${itemImages[i].base64}` } });
    }

    const outfitList = itemDescriptions.map((d, i) => `• Item ${i + 1}: ${d}`).join('\n');

    const prompt = `You are a hyper-realistic virtual try-on AI performing surgical clothing replacement.

ABSOLUTE RULES:
1. Preserve the person's identity exactly: face, skin tone, hair, body shape, pose, expression.
2. Background stays completely unchanged.
3. ONLY replace clothing. Do not alter skin, hair, face, hands, or background.
4. Natural draping, realistic fabric physics, consistent lighting.
5. Fit: ${fitStyle} (size ${size}).
6. Output must look like a real, unedited photograph.

TASK: Replace the person's current clothing with:
${outfitList}

Keep everything except clothing identical.`;

    const content: any[] = [{ type: 'text', text: prompt }, ...imageContent];

    let resultB64: string | null = null;

    try {
      resultB64 = await callAI(apiKey, content);
    } catch (e: any) {
      if (e.message === 'AI_429') {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (e.message === 'AI_402') {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw e;
    }

    if (!resultB64) {
      return new Response(JSON.stringify({ success: false, error: 'AI did not generate the image. Try with a clearer full-body photo.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upload image
    const imageUrl = await uploadImage(supabase, user.id, resultB64, 'result');

    const result: any = { success: true };
    result.imageUrl = imageUrl || `data:image/jpeg;base64,${resultB64}`;

    return new Response(JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Try-on error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

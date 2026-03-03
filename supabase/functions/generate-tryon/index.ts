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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, outfitItems, size } = await req.json();

    if (!photoUrl || !outfitItems || outfitItems.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Photo URL and outfit items are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user photo as base64
    console.log('Fetching user photo...');
    const photoResponse = await fetch(photoUrl);
    if (!photoResponse.ok) throw new Error('Failed to fetch user photo');
    const photoBuffer = await photoResponse.arrayBuffer();
    const photoBase64 = arrayBufferToBase64(photoBuffer);
    const photoMime = photoResponse.headers.get('content-type') || 'image/jpeg';

    // Build outfit description
    const itemDescriptions: string[] = [];
    const fetchPromises: Promise<{ base64: string; mime: string; name: string } | null>[] = [];

    for (const item of outfitItems) {
      const desc = [
        item.brand,
        item.name,
        item.category ? `(${item.category})` : '',
        item.color ? `in ${item.color}` : '',
      ].filter(Boolean).join(' ');
      itemDescriptions.push(desc);

      if (item.image_url) {
        fetchPromises.push(
          fetch(item.image_url)
            .then(async (imgRes) => {
              if (!imgRes.ok) return null;
              const imgBuf = await imgRes.arrayBuffer();
              return {
                base64: arrayBufferToBase64(imgBuf),
                mime: imgRes.headers.get('content-type') || 'image/jpeg',
                name: desc,
              };
            })
            .catch(() => {
              console.log('Could not fetch item image:', item.name);
              return null;
            })
        );
      }
    }

    const itemImages = (await Promise.all(fetchPromises)).filter(Boolean) as { base64: string; mime: string; name: string }[];

    const outfitDescription = itemDescriptions.join(', ');
    const fitStyle =
      size === 'XS' || size === 'S' ? 'tight/fitted' :
      size === 'L' || size === 'XL' || size === 'XXL' ? 'loose/relaxed/oversized' :
      'regular true-to-size';

    console.log('Generating try-on with', itemImages.length, 'item images, size:', size);

    // ─── ADVANCED PROMPT ──────────────────────────────────────────────────────
    // We treat this as a precision IMAGE EDITING task, NOT generation.
    // The base image is the person's photo — EVERYTHING except clothing stays identical.
    const systemInstruction = `You are a hyper-realistic virtual try-on AI that performs surgical clothing replacement on photos.

ABSOLUTE RULES (never break these):
1. The person's identity MUST be preserved exactly: same face, skin tone, hair, body shape, height, pose, and expression.
2. The background MUST remain completely unchanged: same lighting, shadows, environment, and all surrounding pixels.
3. ONLY replace the clothing/outfit items. Do not touch skin, hair, face, hands, feet, or background.
4. Apply the new outfit so it drapes naturally on the person's exact body shape and pose.
5. Maintain realistic lighting: the new clothing should catch light/shadow consistent with the scene lighting.
6. Maintain realistic fabric physics: creases, folds, and drape appropriate for the garment type.
7. Output must look like a single unedited real photograph — no seams, no collage artifacts.
8. The size setting determines fit: ${fitStyle} for size ${size}.

You are editing this photo. The person and background are SACRED and must not change.`;

    const userPrompt = `TASK: Replace the person's current clothing with this outfit:
${itemDescriptions.map((d, i) => `• Item ${i + 1}: ${d}`).join('\n')}

Fit style: ${fitStyle} (size ${size})

CRITICAL:
- Keep the face, hair, skin tone, pose, and background 100% identical to the input photo
- Only the clothing changes — everything else stays pixel-perfect
- Make the outfit look natural on their body with proper draping and fit
- Match the lighting of the scene

The input photo is attached. Additional reference images of each clothing item follow.`;

    // Build multimodal content array
    const userContent: any[] = [
      { type: 'text', text: systemInstruction + '\n\n' + userPrompt },
      // Person's photo — the base to edit
      {
        type: 'image_url',
        image_url: { url: `data:${photoMime};base64,${photoBase64}` },
      },
    ];

    // Add clothing reference images with labels
    for (let i = 0; i < itemImages.length; i++) {
      userContent.push({
        type: 'text',
        text: `Reference image for item ${i + 1}: ${itemImages[i].name}`,
      });
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${itemImages[i].mime};base64,${itemImages[i].base64}` },
      });
    }

    // Call Lovable AI Gateway with image generation model
    const aiResponse = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{ role: 'user', content: userContent }],
          modalities: ['image', 'text'],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: `AI generation failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Extract generated image
    const images = aiData.choices?.[0]?.message?.images;
    let generatedImageBase64: string | null = null;

    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl && imageUrl.startsWith('data:')) {
        generatedImageBase64 = imageUrl.split(',')[1] || null;
      }
    }

    if (!generatedImageBase64) {
      console.error('No image in AI response:', JSON.stringify(aiData).substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'AI did not generate an image. Try with a clearer full-body photo.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save result to storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 → Uint8Array
    const binaryStr = atob(generatedImageBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const filePath = `${user.id}/tryon-result-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('tryon-photos')
      .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Fallback: return base64 directly
      return new Response(
        JSON.stringify({
          success: true,
          imageBase64: `data:image/jpeg;base64,${generatedImageBase64}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: urlData } = supabase.storage.from('tryon-photos').getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ success: true, imageUrl: urlData.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Try-on error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

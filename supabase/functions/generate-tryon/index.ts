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

    // Fetch the user's photo as base64
    console.log('Fetching user photo...');
    const photoResponse = await fetch(photoUrl);
    if (!photoResponse.ok) throw new Error('Failed to fetch user photo');
    const photoBuffer = await photoResponse.arrayBuffer();
    const photoBase64 = arrayBufferToBase64(photoBuffer);
    const photoMime = photoResponse.headers.get('content-type') || 'image/jpeg';

    // Fetch outfit item images as base64
    const itemDescriptions: string[] = [];
    const itemImages: { base64: string; mime: string }[] = [];

    for (const item of outfitItems) {
      itemDescriptions.push(
        `${item.brand ? item.brand + ' ' : ''}${item.name}${item.category ? ' (' + item.category + ')' : ''}`
      );
      if (item.image_url) {
        try {
          const imgRes = await fetch(item.image_url);
          if (imgRes.ok) {
            const imgBuf = await imgRes.arrayBuffer();
            const imgBase64 = arrayBufferToBase64(imgBuf);
            const imgMime = imgRes.headers.get('content-type') || 'image/jpeg';
            itemImages.push({ base64: imgBase64, mime: imgMime });
          }
        } catch (e) {
          console.log('Could not fetch item image:', item.name);
        }
      }
    }

    const outfitDescription = itemDescriptions.join(', ');
    const sizeNote = size === 'XS' || size === 'S' ? 'tight/fitted' :
                     size === 'L' || size === 'XL' || size === 'XXL' ? 'loose/oversized' : 'regular fit';

    console.log('Generating try-on with', itemImages.length, 'item images, size:', size);

    // Build content array for chat completions API
    const userContent: any[] = [
      {
        type: 'text',
        text: `You are a virtual try-on assistant. The first image is a photo of a person. The subsequent images are clothing items: ${outfitDescription}.

Create a realistic image of this SAME person wearing these exact clothing items. The clothing should fit in a ${sizeNote} style (size ${size}).

CRITICAL RULES:
- Keep the person's face, body shape, pose, and background EXACTLY the same
- Replace only their clothing with the provided outfit items
- Make the clothing look natural and properly fitted on their body
- Maintain realistic lighting, shadows, and proportions
- The result should look like a real photo, not a collage`
      },
      {
        type: 'image_url',
        image_url: { url: `data:${photoMime};base64,${photoBase64}` }
      },
    ];

    // Add outfit item images
    for (const img of itemImages) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${img.mime};base64,${img.base64}` }
      });
    }

    // Call Lovable AI Gateway
    const geminiResponse = await fetch(
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

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('AI gateway error:', geminiResponse.status, errText);
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (geminiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: `AI generation failed: ${geminiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log('AI response received');

    // Extract the generated image from chat completions response
    const images = geminiData.choices?.[0]?.message?.images;
    let generatedImageBase64: string | null = null;

    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl && imageUrl.startsWith('data:')) {
        // Extract base64 from data URI
        generatedImageBase64 = imageUrl.split(',')[1] || null;
      }
    }

    if (!generatedImageBase64) {
      console.error('No image in AI response:', JSON.stringify(geminiData).substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: 'AI did not generate an image. Try with a different photo.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save the generated image to storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user from auth header
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

    // Convert base64 to Uint8Array for upload
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
      // Return base64 directly as fallback
      return new Response(
        JSON.stringify({ 
          success: true, 
          imageBase64: `data:image/jpeg;base64,${generatedImageBase64}` 
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

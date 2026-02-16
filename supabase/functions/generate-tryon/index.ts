const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const photoBase64 = btoa(String.fromCharCode(...new Uint8Array(photoBuffer)));
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
            const imgBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
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

    // Build the parts array for Gemini multimodal request
    const parts: any[] = [
      {
        inlineData: {
          mimeType: photoMime,
          data: photoBase64,
        }
      },
    ];

    // Add outfit item images
    for (const img of itemImages) {
      parts.push({
        inlineData: {
          mimeType: img.mime,
          data: img.base64,
        }
      });
    }

    // Add the text prompt
    parts.push({
      text: `You are a virtual try-on assistant. The first image is a photo of a person. The subsequent images are clothing items: ${outfitDescription}.

Create a realistic image of this SAME person wearing these exact clothing items. The clothing should fit in a ${sizeNote} style (size ${size}).

CRITICAL RULES:
- Keep the person's face, body shape, pose, and background EXACTLY the same
- Replace only their clothing with the provided outfit items
- Make the clothing look natural and properly fitted on their body
- Maintain realistic lighting, shadows, and proportions
- The result should look like a real photo, not a collage`
    });

    // Call Gemini image generation model
    const geminiResponse = await fetch(
      'https://aigateway.lovable.dev/v1beta/models/gemini-3-pro-image-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            imageMimeType: 'image/jpeg',
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('Gemini error:', errText);
      return new Response(
        JSON.stringify({ success: false, error: `AI generation failed: ${geminiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received');

    // Extract the generated image
    const candidates = geminiData.candidates || [];
    let generatedImageBase64: string | null = null;

    for (const candidate of candidates) {
      const candidateParts = candidate.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData?.data) {
          generatedImageBase64 = part.inlineData.data;
          break;
        }
      }
      if (generatedImageBase64) break;
    }

    if (!generatedImageBase64) {
      console.error('No image in Gemini response:', JSON.stringify(geminiData).substring(0, 500));
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

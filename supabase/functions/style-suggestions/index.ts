const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const COUNTRY_INFO: Record<string, { currency: string; symbol: string; fashion: string }> = {
  US: { currency: 'USD', symbol: '$', fashion: 'American streetwear, preppy, workwear, athleisure trends' },
  GB: { currency: 'GBP', symbol: '£', fashion: 'British fashion, smart-casual, London streetwear, heritage brands' },
  IN: { currency: 'INR', symbol: '₹', fashion: 'Indian fashion, Indo-western fusion, ethnic wear, Bollywood-inspired trends' },
  DE: { currency: 'EUR', symbol: '€', fashion: 'German minimalist fashion, functional style, European trends' },
  FR: { currency: 'EUR', symbol: '€', fashion: 'Parisian chic, haute couture influence, effortless elegance' },
  IT: { currency: 'EUR', symbol: '€', fashion: 'Italian luxury fashion, Mediterranean style, tailored fits' },
  JP: { currency: 'JPY', symbol: '¥', fashion: 'Japanese streetwear, Harajuku, minimalist, techwear trends' },
  KR: { currency: 'KRW', symbol: '₩', fashion: 'K-fashion, Korean streetwear, K-pop inspired trends' },
  AU: { currency: 'AUD', symbol: 'A$', fashion: 'Australian coastal style, relaxed fit, outdoor fashion' },
  CA: { currency: 'CAD', symbol: 'C$', fashion: 'Canadian fashion, layering, outdoor-meets-urban style' },
  BR: { currency: 'BRL', symbol: 'R$', fashion: 'Brazilian fashion, vibrant colors, tropical casual' },
  AE: { currency: 'AED', symbol: 'د.إ', fashion: 'Middle Eastern luxury, modest fashion, high-end brands' },
  SA: { currency: 'SAR', symbol: '﷼', fashion: 'Saudi fashion, modest luxury, traditional meets modern' },
  MX: { currency: 'MXN', symbol: 'MX$', fashion: 'Mexican fashion, colorful patterns, casual Latin American style' },
  SG: { currency: 'SGD', symbol: 'S$', fashion: 'Singaporean fashion, tropical smart-casual, Asian fusion' },
  SE: { currency: 'SEK', symbol: 'kr', fashion: 'Scandinavian minimalism, sustainable fashion, clean lines' },
  NG: { currency: 'NGN', symbol: '₦', fashion: 'Nigerian fashion, Ankara prints, vibrant African style' },
  ZA: { currency: 'ZAR', symbol: 'R', fashion: 'South African fashion, vibrant prints, African contemporary' },
  TR: { currency: 'TRY', symbol: '₺', fashion: 'Turkish fashion, East-meets-West, modern modest fashion' },
  CN: { currency: 'CNY', symbol: '¥', fashion: 'Chinese fashion, guochao trend, tech-influenced streetwear' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { outfitItems, missingZones, country } = await req.json();

    if (!outfitItems || outfitItems.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one outfit item is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const countryData = country ? COUNTRY_INFO[country] : null;
    const currencySymbol = countryData?.symbol || '$';
    const currencyCode = countryData?.currency || 'USD';

    const itemDescriptions = outfitItems.map((item: any) =>
      `- ${item.brand || ''} ${item.name} (${item.category || 'unknown'})${item.price ? ` - ${item.price}` : ''}`
    ).join('\n');

    const fashionContext = countryData
      ? `\n\nThe user is based in a region with these fashion preferences: ${countryData.fashion}. Tailor your brand and style suggestions accordingly. Suggest brands popular/available in that region.`
      : '';

    const currencyNote = `\n\nIMPORTANT: All price_range values MUST be in ${currencyCode} using the "${currencySymbol}" symbol. Example: "${currencySymbol}2,000 - ${currencySymbol}5,000"`;

    const systemPrompt = `You are a Gen-Z fashion stylist AI. Given the current outfit items, suggest complementary pieces to complete the look.

Focus on:
- Color coordination and contrast
- Style consistency (streetwear, formal, casual, athleisure, etc.)
- Current fashion trends
- Practical outfit completeness${fashionContext}${currencyNote}

For each suggestion, provide a specific product recommendation with brand, name, color, and why it works.`;

    const userPrompt = `Current outfit:
${itemDescriptions}

${missingZones?.length > 0 ? `Missing categories that need filling: ${missingZones.join(', ')}` : 'Suggest items that would elevate this outfit.'}

Give me 3-4 specific suggestions to complete or elevate this fit.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_items',
              description: 'Return styling suggestions for the outfit',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string', enum: ['topwear', 'bottomwear', 'outerwear', 'footwear', 'accessory'] },
                        brand: { type: 'string' },
                        item_name: { type: 'string' },
                        color: { type: 'string' },
                        reason: { type: 'string' },
                        price_range: { type: 'string' },
                      },
                      required: ['category', 'item_name', 'color', 'reason'],
                      additionalProperties: false,
                    },
                  },
                  style_notes: { type: 'string' },
                },
                required: ['suggestions', 'style_notes'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_items' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      return new Response(
        JSON.stringify({ success: false, error: 'AI styling failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI did not return suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Styling error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

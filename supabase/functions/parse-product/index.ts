const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scrapedContent, productUrl } = await req.json();

    if (!scrapedContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Scraped content is required' }),
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

    const systemPrompt = `You are a fashion product data extractor. Given scraped webpage content, extract structured product information.

Return a JSON object with these fields:
- name: string (product name)
- brand: string (brand name)
- price: string (price with currency symbol)
- image_url: string (main product image URL, pick the highest quality one)
- category: one of "topwear", "bottomwear", "outerwear", "footwear", "accessory"
- colors: string[] (available colors)
- sizes: string[] (available sizes like ["XS","S","M","L","XL"])
- size_chart: object with size keys mapping to measurement objects, e.g. {"S": {"chest": 36, "waist": 30, "length": 27}, "M": {"chest": 38, "waist": 32, "length": 28}}. Measurements should be in inches. If no size chart data is found, return an empty object {}.

Be precise. If you can't find a field, use null. For the size_chart, try to extract any measurement data from the page.`;

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
          { role: 'user', content: `Product URL: ${productUrl}\n\nScraped content:\n${scrapedContent.substring(0, 15000)}` },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_product',
              description: 'Extract structured product data from scraped content',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  brand: { type: 'string' },
                  price: { type: 'string' },
                  image_url: { type: 'string' },
                  category: { type: 'string', enum: ['topwear', 'bottomwear', 'outerwear', 'footwear', 'accessory'] },
                  colors: { type: 'array', items: { type: 'string' } },
                  sizes: { type: 'array', items: { type: 'string' } },
                  size_chart: { type: 'object' },
                },
                required: ['name', 'brand', 'category'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_product' } },
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
        JSON.stringify({ success: false, error: 'AI parsing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI did not return structured data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const productData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: productData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Parse error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

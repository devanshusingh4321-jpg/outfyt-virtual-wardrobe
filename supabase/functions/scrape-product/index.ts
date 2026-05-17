const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    // Resolve short links / deep links (e.g. onelink.me, bit.ly, amzn.to, a.co)
    formattedUrl = await resolveShortLink(formattedUrl);
    console.log('Resolved URL:', formattedUrl);

    // Attempt 1: Direct scrape with extended timeout
    let data = await attemptScrape(apiKey, formattedUrl);

    // Attempt 2: If scrape failed (timeout/blocked), try search-based fallback
    if (!data.success && !data.data) {
      console.log('Direct scrape failed, trying search fallback...');
      data = await attemptSearchFallback(apiKey, formattedUrl);
    }

    if (!data.success && !data.data) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not scrape this product. The site may block automated access. Try a different retailer or use manual input.' 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function attemptScrape(apiKey: string, url: string) {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: true,
        timeout: 90000,
        waitFor: 5000,
        location: { country: 'IN', languages: ['en'] },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Firecrawl scrape error:', data);
      return { success: false, error: data.error };
    }
    return data;
  } catch (e) {
    console.error('Scrape attempt failed:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Scrape failed' };
  }
}

async function attemptSearchFallback(apiKey: string, url: string) {
  try {
    // Extract product name from URL for search query
    const urlParts = url.split('/');
    const productSlug = urlParts
      .filter(p => p.length > 5 && !p.includes('.') && !p.includes('http') && !p.includes('www') && !/^\d+$/.test(p))
      .pop() || '';
    const searchQuery = productSlug.replace(/[-_]/g, ' ').substring(0, 100);

    if (!searchQuery) {
      return { success: false, error: 'Could not extract search query from URL' };
    }

    // Extract domain for site-specific search
    const domain = new URL(url).hostname;
    const query = `site:${domain} ${searchQuery}`;

    console.log('Search fallback query:', query);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 1,
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.data || data.data.length === 0) {
      console.error('Search fallback failed:', data);
      return { success: false, error: 'Search fallback returned no results' };
    }

    // Reshape search result to look like a scrape result
    const result = data.data[0];
    return {
      success: true,
      data: {
        markdown: result.markdown || result.description || '',
        metadata: {
          title: result.title || '',
          sourceURL: result.url || url,
        },
      },
    };
  } catch (e) {
    console.error('Search fallback error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Search failed' };
  }
}

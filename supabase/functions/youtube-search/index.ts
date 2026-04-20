// Resolves the first YouTube videoId for a given search query (no API key).
// Scrapes the public results page and extracts the first ID via regex.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) return json({ error: "Missing q" }, 400);

    const target = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=pt&gl=BR`;
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return json({ error: "Upstream failed", status: res.status }, 502);

    const html = await res.text();

    const patterns = [
      /"videoId":"([a-zA-Z0-9_-]{11})"/,
      /\/watch\?v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) return json({ videoId: m[1] });
    }

    return json({ error: "No video found" }, 404);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

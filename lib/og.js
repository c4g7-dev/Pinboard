/**
 * Fetch Open Graph metadata from a URL.
 * Security: only http/https, 5s timeout, 500KB body limit, max 3 redirects.
 */
async function fetchOG(url) {
  const result = { og_title: null, og_desc: null, og_image: null };

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return result;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PinboardBot/1.0)',
        'Accept': 'text/html',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return result;

    // Read limited body
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return result;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    const MAX_BYTES = 500 * 1024;
    let bytesRead = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });
      if (bytesRead >= MAX_BYTES) break;
    }

    reader.cancel();

    // Extract OG tags with regex
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*?)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:title["']/i);
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*?)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:description["']/i);
    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*?)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']og:image["']/i);

    if (ogTitle) result.og_title = ogTitle[1].slice(0, 200);
    if (ogDesc) result.og_desc = ogDesc[1].slice(0, 500);
    if (ogImage) {
      // Validate image URL
      try {
        const imgUrl = new URL(ogImage[1], url);
        if (['http:', 'https:'].includes(imgUrl.protocol)) {
          result.og_image = imgUrl.href.slice(0, 1000);
        }
      } catch { /* ignore invalid image URLs */ }
    }
  } catch {
    // Timeout, network error, etc. — return nulls
  }

  return result;
}

module.exports = { fetchOG };

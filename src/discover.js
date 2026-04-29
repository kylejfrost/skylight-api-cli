const APP_URL = 'https://ourskylight.com/';

export async function fetchWebBundle() {
  const html = await (await fetch(APP_URL)).text();
  const asset = html.match(/src="([^"]*\/index-[^"]+\.js)"/)?.[1];
  if (!asset) throw new Error('could not find skylight web bundle');
  const url = new URL(asset, APP_URL);
  return { url: url.href, source: await (await fetch(url)).text() };
}

export function discoverEndpoints(source) {
  const methods = ['get', 'post', 'put', 'patch', 'delete'];
  const rows = [];
  for (const method of methods) {
    const patterns = [
      new RegExp(`apisauce\\.${method}\\(\\\`([^\\\`]+)\\\``, 'g'),
      new RegExp(`apisauce\\.${method}\\('([^']+)'`, 'g'),
      new RegExp(`apisauce\\.${method}\\(\"([^\"]+)\"`, 'g'),
    ];
    for (const pattern of patterns) {
      for (const m of source.matchAll(pattern)) {
        const endpoint = m[1];
        if (!/(frames|user|oauth|password|assistant|reminder)/.test(endpoint)) continue;
        rows.push({ method: method.toUpperCase(), endpoint });
      }
    }
  }
  const seen = new Set();
  return rows.filter((r) => {
    const key = `${r.method} ${r.endpoint}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.endpoint.localeCompare(b.endpoint) || a.method.localeCompare(b.method));
}

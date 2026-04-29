import crypto from 'node:crypto';

const CLIENT_ID = 'skylight-mobile';
const REDIRECT_URI = 'skylight-family://welcome';
const SCOPE = 'everything';

function form(body) {
  return new URLSearchParams(body).toString();
}

function csrfFrom(html) {
  return html.match(/name="authenticity_token" value="([^"]+)"/)?.[1];
}

function cookiesFrom(headers) {
  return headers.getSetCookie?.() || [];
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function storeCookies(jar, headers) {
  for (const line of cookiesFrom(headers)) {
    const first = line.split(';', 1)[0];
    const idx = first.indexOf('=');
    if (idx > 0) jar.set(first.slice(0, idx), first.slice(idx + 1));
  }
}

async function request(url, options = {}, jar) {
  const headers = new Headers(options.headers || {});
  if (jar?.size) headers.set('cookie', cookieHeader(jar));
  const res = await fetch(url, { ...options, headers, redirect: 'manual' });
  if (jar) storeCookies(jar, res.headers);
  return res;
}

export async function login({ baseUrl, email, password }) {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(18).toString('base64url');
  const authorizeUrl = new URL('/oauth/authorize', baseUrl);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'login',
  });

  const jar = new Map();
  let res = await request(authorizeUrl, {}, jar);
  while (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
    res = await request(new URL(res.headers.get('location'), baseUrl), {}, jar);
  }
  const html = await res.text();
  const token = csrfFrom(html);
  if (!token) throw new Error('could not start skylight login, csrf token not found');

  res = await request(new URL('/auth/session', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form({ authenticity_token: token, email, password }),
  }, jar);

  let location = res.headers.get('location');
  for (let i = 0; location && i < 8; i++) {
    if (location.startsWith('skylight-family:')) break;
    res = await request(new URL(location, baseUrl), {}, jar);
    location = res.headers.get('location');
  }
  if (!location?.startsWith('skylight-family:')) throw new Error('skylight login did not return oauth redirect');
  const returned = new URL(location);
  if (returned.searchParams.get('state') !== state) throw new Error('oauth state mismatch');
  const code = returned.searchParams.get('code');
  if (!code) throw new Error('oauth code missing');

  res = await fetch(new URL('/oauth/token', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form({ grant_type: 'authorization_code', client_id: CLIENT_ID, code, redirect_uri: REDIRECT_URI, code_verifier: verifier }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`token exchange failed: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

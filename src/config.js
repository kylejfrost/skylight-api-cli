import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

function loadDotEnv(file = '.env') {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

function env(name) {
  return process.env[name] && process.env[name].trim() ? process.env[name].trim() : undefined;
}

function opField(item, field, vault) {
  const args = ['item', 'get', item, '--field', field, '--reveal'];
  if (vault) args.splice(3, 0, '--vault', vault);
  const res = spawnSync('op', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 8000 });
  if (res.error?.code === 'ETIMEDOUT') throw new Error('1password cli timed out. unlock/sign in to 1password or use environment variables.');
  if (res.status !== 0) return undefined;
  return res.stdout.trim() || undefined;
}

export function loadConfig(options = {}) {
  loadDotEnv(options.envFile || '.env');
  const item = options.opItem || env('SKYLIGHT_1PASSWORD_ITEM');
  const vault = options.opVault || env('SKYLIGHT_1PASSWORD_VAULT');
  const cfg = {
    baseUrl: options.baseUrl || env('SKYLIGHT_URL') || 'https://app.ourskylight.com',
    email: options.email || env('SKYLIGHT_EMAIL'),
    password: options.password || env('SKYLIGHT_PASSWORD'),
    frameId: options.frameId || env('SKYLIGHT_FRAME_ID'),
    token: options.token || env('SKYLIGHT_TOKEN'),
    opItem: item,
    opVault: vault,
  };
  if (item) {
    cfg.email ||= opField(item, 'username', vault) || opField(item, 'email', vault);
    cfg.password ||= opField(item, 'password', vault);
    cfg.frameId ||= opField(item, 'frame_id', vault) || opField(item, 'frame id', vault) || opField(item, 'frameId', vault);
  }
  if (!cfg.token) {
    const tokenFile = options.tokenFile || env('SKYLIGHT_TOKEN_FILE') || resolve(homedir(), '.skylight_token');
    if (existsSync(tokenFile)) {
      const raw = readFileSync(tokenFile, 'utf8').trim();
      cfg.token = raw.replace(/^Bearer\s+/i, '');
    }
  }
  return cfg;
}

export function requireConfig(cfg, fields = ['email', 'password']) {
  const missing = fields.filter((f) => !cfg[f]);
  if (missing.length) {
    throw new Error(`missing skylight config: ${missing.join(', ')}. use env vars or SKYLIGHT_1PASSWORD_ITEM.`);
  }
}

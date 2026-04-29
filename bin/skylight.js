#!/usr/bin/env node
import { loadConfig, requireConfig } from '../src/config.js';
import { login } from '../src/auth.js';
import { SkylightClient } from '../src/client.js';
import { fetchWebBundle, discoverEndpoints } from '../src/discover.js';
import { readonlySmoke } from '../src/smoke.js';

function parse(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else {
      const key = a.slice(2);
      if (['json','readonly','pretty'].includes(key)) out[key] = true;
      else out[key] = argv[++i];
    }
  }
  return out;
}

function usage() {
  return `skylight <command>

commands:
  auth token [--json]
  me [--json]
  frame get [--json]
  users [--json]
  devices [--json]
  categories [--json]
  lists [--json]
  list-items <list-id> [--json]
  chores --after yyyy-mm-dd --before yyyy-mm-dd [--json]
  task-box [--json]
  rewards [--json]
  meals categories|recipes [--json]
  discover [--json]
  smoke --readonly [--json]

config:
  SKYLIGHT_EMAIL, SKYLIGHT_PASSWORD, SKYLIGHT_FRAME_ID
  or SKYLIGHT_1PASSWORD_ITEM and optional SKYLIGHT_1PASSWORD_VAULT
`;
}

function print(data, json = false) {
  if (json) console.log(JSON.stringify(data, null, 2));
  else if (Array.isArray(data)) for (const row of data) console.log(typeof row === 'string' ? row : JSON.stringify(row));
  else console.log(JSON.stringify(data, null, 2));
}

function summarizeJsonApi(body) {
  const data = body?.data;
  if (Array.isArray(data)) return data.map((x) => ({ id: x.id, type: x.type, ...pickAttrs(x.attributes) }));
  if (data?.type) return { id: data.id, type: data.type, ...pickAttrs(data.attributes), included: body.included?.length };
  return body;
}

function pickAttrs(attrs = {}) {
  const keep = ['label','name','summary','status','kind','email','timezone','hardware_model','color','position','created_at'];
  return Object.fromEntries(Object.entries(attrs).filter(([k]) => keep.includes(k)));
}

async function main() {
  const args = parse(process.argv.slice(2));
  const [cmd, sub, sub2] = args._;
  if (!cmd || cmd === 'help' || cmd === '--help') { console.log(usage()); return; }
  const cfg = loadConfig(args);
  const client = new SkylightClient(cfg);

  if (cmd === 'discover') {
    const { url, source } = await fetchWebBundle();
    const endpoints = discoverEndpoints(source);
    const counts = endpoints.reduce((m, r) => (m[r.method] = (m[r.method] || 0) + 1, m), {});
    print({ bundle: url, total: endpoints.length, counts, endpoints }, args.json);
    return;
  }

  requireConfig(cfg, ['email', 'password']);
  if (!['auth'].includes(cmd)) requireConfig(cfg, ['frameId']);

  if (cmd === 'auth' && sub === 'token') {
    const tok = await login(cfg);
    if (args.json) print({ ...tok, access_token: tok.access_token ? '[redacted]' : undefined, refresh_token: tok.refresh_token ? '[redacted]' : undefined }, true);
    else console.log(tok.access_token);
    return;
  }

  let body;
  if (cmd === 'me') body = await client.me();
  else if (cmd === 'frame' && sub === 'get') body = await client.frame();
  else if (cmd === 'users') body = await client.users();
  else if (cmd === 'devices') body = await client.devices();
  else if (cmd === 'categories') body = await client.categories();
  else if (cmd === 'lists') body = await client.lists();
  else if (cmd === 'list-items') body = await client.listItems(sub);
  else if (cmd === 'chores') body = await client.chores({ after: args.after, before: args.before });
  else if (cmd === 'task-box') body = await client.taskBox();
  else if (cmd === 'rewards') body = await client.rewards();
  else if (cmd === 'meals' && sub === 'categories') body = await client.mealCategories();
  else if (cmd === 'meals' && sub === 'recipes') body = await client.meals();
  else if (cmd === 'smoke') {
    if (!args.readonly) throw new Error('only read-only smoke is implemented. pass --readonly.');
    const results = await readonlySmoke(client);
    print({ ok: results.every((r) => r.ok), results }, args.json);
    process.exitCode = results.every((r) => r.ok) ? 0 : 1;
    return;
  } else {
    throw new Error(`unknown command.\n${usage()}`);
  }
  print(args.json ? body : summarizeJsonApi(body), args.json);
}

main().catch((e) => {
  console.error(`error: ${e.message}`);
  if (e.body) console.error(JSON.stringify(e.body, null, 2));
  process.exit(1);
});

#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { loadConfig, requireConfig } from '../src/config.js';
import { login } from '../src/auth.js';
import { SkylightClient } from '../src/client.js';
import { fetchWebBundle, discoverEndpoints } from '../src/discover.js';
import { readonlySmoke } from '../src/smoke.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parse(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else {
      const key = a.slice(2);
      if (['json','readonly','pretty','yes','dry-run'].includes(key)) out[key] = true;
      else out[key] = argv[++i];
    }
  }
  return out;
}

function usage() {
  return `skylight <command>

safe/read commands:
  auth token [--json]
  discover [--json]
  smoke --readonly [--json]
  api GET <path> [--json]
  me [--json]
  frame get [--json]
  users|devices|categories|lists|task-box|rewards [--json]
  list-items <list-id> [--json]
  chores --after yyyy-mm-dd --before yyyy-mm-dd [--json]
  meals categories|recipes [--json]

mutating commands require --yes:
  api POST|PUT|PATCH|DELETE <path> --body '{...}' --yes
  lists create --body '{...}' --yes
  lists update <list-id> --body '{...}' --yes
  lists delete <list-id> --yes
  list-items create <list-id> --body '{"label":"milk","status":"pending"}' --yes
  list-items update <list-id> <item-id> --body '{...}' --yes
  list-items delete <list-id> <item-id> --yes
  task-box create|update|delete ... --yes
  categories create|update|delete ... --yes
  chores create|update|complete|delete ... --yes
  rewards create|update|delete|redeem|unredeem ... --yes
  meals create-recipe|update-recipe|add-to-grocery ... --yes
  albums create|update|delete ... --yes
  messages caption|like|unlike|comment|delete ... --yes
  users add|approve|block ... --yes

config:
  reads .env in current directory, then SKYLIGHT_EMAIL, SKYLIGHT_PASSWORD, SKYLIGHT_FRAME_ID
`;
}

function print(data, json = false) {
  if (json) console.log(JSON.stringify(data, null, 2));
  else if (Array.isArray(data)) for (const row of data) console.log(typeof row === 'string' ? row : JSON.stringify(row));
  else console.log(JSON.stringify(data, null, 2));
}

function bodyArg(args) {
  if (args.bodyFile) return JSON.parse(readFileSync(args.bodyFile, 'utf8'));
  if (!args.body) return undefined;
  return JSON.parse(args.body);
}

function requireYes(args, label = 'mutation') {
  if (args['dry-run']) {
    console.log(`[dry-run] would run ${label}`);
    process.exit(0);
  }
  if (!args.yes) throw new Error(`${label} requires --yes. use --dry-run to print intent.`);
}

function summarizeJsonApi(body) {
  const data = body?.data;
  if (Array.isArray(data)) return data.map((x) => ({ id: x.id, type: x.type, ...pickAttrs(x.attributes) }));
  if (data?.type) return { id: data.id, type: data.type, ...pickAttrs(data.attributes), included: body.included?.length };
  return body;
}

function pickAttrs(attrs = {}) {
  const keep = ['label','name','summary','status','kind','email','timezone','hardware_model','color','position','created_at','start','start_time','points','title'];
  return Object.fromEntries(Object.entries(attrs).filter(([k]) => keep.includes(k)));
}

async function main() {
  const args = parse(process.argv.slice(2));
  const [cmd, sub, a, b, c] = args._;
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

  if (!cfg.token) requireConfig(cfg, ['email', 'password']);
  if (!['auth'].includes(cmd)) requireConfig(cfg, ['frameId']);

  if (cmd === 'auth' && sub === 'token') {
    const tok = await login(cfg);
    if (args.json) print({ ...tok, access_token: tok.access_token ? '[redacted]' : undefined, refresh_token: tok.refresh_token ? '[redacted]' : undefined }, true);
    else console.log(tok.access_token);
    return;
  }

  let body;
  if (cmd === 'api') {
    const method = String(sub || '').toUpperCase();
    const path = a;
    if (!method || !path || !['GET','POST','PUT','PATCH','DELETE'].includes(method)) throw new Error('usage: skylight api GET|POST|PUT|PATCH|DELETE <path> [--body json]');
    if (MUTATING.has(method)) requireYes(args, `${method} ${path}`);
    body = await client.api(path, { method, body: bodyArg(args) });
  } else if (cmd === 'me') body = await client.me();
  else if (cmd === 'frame' && sub === 'get') body = await client.frame();
  else if (cmd === 'users' && !sub) body = await client.users();
  else if (cmd === 'users' && sub === 'add') { requireYes(args, 'add frame user'); body = await client.addUser(args.email || a); }
  else if (cmd === 'users' && sub === 'approve') { requireYes(args, 'approve frame user'); body = await client.approveUser(a); }
  else if (cmd === 'users' && sub === 'block') { requireYes(args, 'block frame user'); body = await client.blockUser(a); }
  else if (cmd === 'devices' && !sub) body = await client.devices();
  else if (cmd === 'devices' && sub === 'get') body = await client.device(a);
  else if (cmd === 'devices' && sub === 'update') { requireYes(args, 'update device'); body = await client.updateDevice(a, bodyArg(args)); }
  else if (cmd === 'devices' && sub === 'alarms') body = await client.alarms(a);
  else if (cmd === 'categories' && !sub) body = await client.categories();
  else if (cmd === 'categories' && sub === 'get') body = await client.category(a);
  else if (cmd === 'categories' && sub === 'create') { requireYes(args, 'create category'); body = await client.createCategory(bodyArg(args)); }
  else if (cmd === 'categories' && sub === 'update') { requireYes(args, 'update category'); body = await client.updateCategory(a, bodyArg(args)); }
  else if (cmd === 'categories' && sub === 'delete') { requireYes(args, 'delete category'); body = await client.deleteCategory(a); }
  else if (cmd === 'lists' && !sub) body = await client.lists();
  else if (cmd === 'lists' && sub === 'get') body = await client.list(a);
  else if (cmd === 'lists' && sub === 'create') { requireYes(args, 'create list'); body = await client.createList(bodyArg(args)); }
  else if (cmd === 'lists' && sub === 'update') { requireYes(args, 'update list'); body = await client.updateList(a, bodyArg(args)); }
  else if (cmd === 'lists' && sub === 'delete') { requireYes(args, 'delete list'); body = await client.deleteList(a); }
  else if (cmd === 'list-items' && a === undefined && sub) body = await client.listItems(sub);
  else if (cmd === 'list-items' && sub === 'create') { requireYes(args, 'create list item'); body = await client.createListItem(a, bodyArg(args)); }
  else if (cmd === 'list-items' && sub === 'update') { requireYes(args, 'update list item'); body = await client.updateListItem(a, b, bodyArg(args)); }
  else if (cmd === 'list-items' && sub === 'delete') { requireYes(args, 'delete list item'); body = await client.deleteListItem(a, b); }
  else if (cmd === 'list-items' && sub === 'move') { requireYes(args, 'move list item'); body = await client.moveListItem(a, b, args.after || null); }
  else if (cmd === 'chores' && !sub) body = await client.chores({ after: args.after, before: args.before });
  else if (cmd === 'chores' && sub === 'create') { requireYes(args, 'create chores'); body = await client.createChores(bodyArg(args)); }
  else if (cmd === 'chores' && sub === 'update') { requireYes(args, 'update chore'); body = await client.updateChore(a, bodyArg(args)); }
  else if (cmd === 'chores' && sub === 'complete') { requireYes(args, 'complete chore'); body = await client.completeChore(a, bodyArg(args) || {}); }
  else if (cmd === 'chores' && sub === 'delete') { requireYes(args, 'delete chore'); body = await client.deleteChore(a); }
  else if (cmd === 'task-box' && !sub) body = await client.taskBox();
  else if (cmd === 'task-box' && sub === 'create') { requireYes(args, 'create task box item'); body = await client.createTaskBoxItem(bodyArg(args)); }
  else if (cmd === 'task-box' && sub === 'update') { requireYes(args, 'update task box item'); body = await client.updateTaskBoxItem(a, bodyArg(args)); }
  else if (cmd === 'task-box' && sub === 'delete') { requireYes(args, 'delete task box item'); body = await client.deleteTaskBoxItem(a); }
  else if (cmd === 'rewards' && !sub) body = await client.rewards();
  else if (cmd === 'rewards' && sub === 'get') body = await client.reward(a);
  else if (cmd === 'rewards' && sub === 'create') { requireYes(args, 'create reward'); body = await client.createReward(bodyArg(args)); }
  else if (cmd === 'rewards' && sub === 'update') { requireYes(args, 'update reward'); body = await client.updateReward(a, bodyArg(args)); }
  else if (cmd === 'rewards' && sub === 'delete') { requireYes(args, 'delete reward'); body = await client.deleteReward(a); }
  else if (cmd === 'rewards' && sub === 'redeem') { requireYes(args, 'redeem reward'); body = await client.redeemReward(a); }
  else if (cmd === 'rewards' && sub === 'unredeem') { requireYes(args, 'unredeem reward'); body = await client.unredeemReward(a); }
  else if (cmd === 'rewards' && sub === 'points') body = await client.rewardPoints();
  else if (cmd === 'meals' && sub === 'categories') body = await client.mealCategories();
  else if (cmd === 'meals' && sub === 'recipes') body = await client.meals();
  else if (cmd === 'meals' && sub === 'recipe') body = await client.mealRecipe(a);
  else if (cmd === 'meals' && sub === 'create-recipe') { requireYes(args, 'create meal recipe'); body = await client.createMealRecipe(bodyArg(args)); }
  else if (cmd === 'meals' && sub === 'update-recipe') { requireYes(args, 'update meal recipe'); body = await client.updateMealRecipe(a, bodyArg(args)); }
  else if (cmd === 'meals' && sub === 'add-to-grocery') { requireYes(args, 'add recipe to grocery list'); body = await client.addMealRecipeToGroceryList(a); }
  else if (cmd === 'albums' && !sub) body = await client.albums();
  else if (cmd === 'albums' && sub === 'get') body = await client.album(a);
  else if (cmd === 'albums' && sub === 'create') { requireYes(args, 'create album'); body = await client.createAlbum(bodyArg(args)); }
  else if (cmd === 'albums' && sub === 'update') { requireYes(args, 'update album'); body = await client.updateAlbum(a, bodyArg(args)); }
  else if (cmd === 'albums' && sub === 'delete') { requireYes(args, 'delete album'); body = await client.deleteAlbum(a); }
  else if (cmd === 'messages' && !sub) body = await client.messages();
  else if (cmd === 'messages' && sub === 'get') body = await client.message(a);
  else if (cmd === 'messages' && sub === 'delete') { requireYes(args, 'delete message'); body = await client.deleteMessage(a); }
  else if (cmd === 'messages' && sub === 'caption') { requireYes(args, 'update message caption'); body = await client.updateMessageCaption(a, bodyArg(args)); }
  else if (cmd === 'messages' && sub === 'likes') body = await client.messageLikes(a);
  else if (cmd === 'messages' && sub === 'like') { requireYes(args, 'like message'); body = await client.likeMessage(a); }
  else if (cmd === 'messages' && sub === 'unlike') { requireYes(args, 'unlike message'); body = await client.unlikeMessage(a); }
  else if (cmd === 'messages' && sub === 'comment') { requireYes(args, 'comment message'); body = await client.commentMessage(a, bodyArg(args)); }
  else if (cmd === 'source-calendars' && !sub) body = await client.sourceCalendars();
  else if (cmd === 'source-calendars' && sub === 'get') body = await client.sourceCalendar(a);
  else if (cmd === 'source-calendars' && sub === 'create') { requireYes(args, 'create source calendar'); body = await client.createSourceCalendar(bodyArg(args)); }
  else if (cmd === 'source-calendars' && sub === 'update') { requireYes(args, 'update source calendar'); body = await client.updateSourceCalendar(a, bodyArg(args)); }
  else if (cmd === 'source-calendars' && sub === 'delete') { requireYes(args, 'delete source calendar'); body = await client.deleteSourceCalendar(a); }
  else if (cmd === 'calendar-accounts') body = await client.calendarAccounts();
  else if (cmd === 'calendar-events') body = await client.calendarEvents({ from: args.from, to: args.to });
  else if (cmd === 'settings' && sub === 'household') body = await client.householdConfig();
  else if (cmd === 'settings' && sub === 'event-notifications') body = await client.eventNotificationSettings();
  else if (cmd === 'auto-intents') body = await client.autoCreationIntents();
  else if (cmd === 'month-in-review') body = await client.monthInReview();
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

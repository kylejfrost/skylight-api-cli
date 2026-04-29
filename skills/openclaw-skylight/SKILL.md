---
name: skylight
summary: use the unofficial skylight api cli for read-only skylight calendar/frame/list/chores inspection and carefully gated sync/debug workflows.
---

# skylight skill

use this skill when kyle asks about skylight, skylight calendar, skylight frame, chores, grocery/shopping lists, task box, meal recipes, rewards, frame users, devices, or source calendars.

this is unofficial and not affiliated with skylight.

## hard rules

- default to read-only commands.
- never create, update, delete, complete, redeem, reset, invite, approve, block, or sync-write unless kyle explicitly asks for that exact mutation.
- do not print tokens, passwords, share tokens, private emails, phone numbers, or raw full api responses into chat.
- local credentials live in `/Users/apollo/skylight-api-cli/.env`, which must stay ignored and untracked.
- do not store credentials in scripts, memory, logs, or committed repo files.
- if a response contains personal data, summarize only the needed fields.

## setup

credential source:

`/Users/apollo/skylight-api-cli/.env`

cli path during local development:

`/Users/apollo/skylight-api-cli/bin/skylight.js`

## common commands

read-only smoke test:

`cd /Users/apollo/skylight-api-cli && skylight smoke --readonly --json`

current user:

`skylight me --json`

frame:

`skylight frame get --json`

lists:

`skylight lists`

list items:

`skylight list-items 1106032`

chores:

`skylight chores --after YYYY-MM-DD --before YYYY-MM-DD`

endpoint discovery:

`skylight discover --json`

## legal language for public docs

include: "unofficial, not affiliated with, endorsed by, sponsored by, or supported by skylight. use only with accounts/devices you own or are authorized to access. respect skylight's terms and infrastructure."

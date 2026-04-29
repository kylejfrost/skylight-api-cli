# skylight-api-cli

unofficial cli and openclaw agent skill for the skylight calendar/frame web api.

not affiliated with, endorsed by, sponsored by, or supported by skylight. see `NOTICE`.

## status

experimental. read-only operations are the default recommendation. mutating endpoints exist in the web app, but this cli keeps smoke tests read-only unless you explicitly build your own write workflow.

## install

```sh
npm install -g skylight-api-cli
```

local checkout:

```sh
git clone <repo-url>
cd skylight-api-cli
npm link
```

## credentials

use environment variables:

```sh
export SKYLIGHT_EMAIL='you@example.com'
export SKYLIGHT_PASSWORD='...'
export SKYLIGHT_FRAME_ID='1234567'
```

or 1password:

```sh
op item create --category login --vault Private --title 'Skylight API' \
  username='you@example.com' password='...' frame_id='1234567'

SKYLIGHT_1PASSWORD_ITEM='Skylight API' skylight smoke --readonly
```

## commands

```sh
skylight auth token --json
skylight me
skylight frame get
skylight lists
skylight list-items <list-id>
skylight chores --after 2026-04-29 --before 2026-04-29
skylight categories
skylight task-box
skylight rewards
skylight meals recipes
skylight discover
skylight smoke --readonly
```

## auth model

current web/mobile auth uses oauth pkce:

1. `GET /oauth/authorize`
2. `POST /auth/session` with csrf/email/password
3. follow redirect to `skylight-family://welcome?code=...`
4. `POST /oauth/token`
5. api calls use `authorization: bearer <access_token>`

## legal

this is an unofficial interoperability tool. use it only with accounts, frames, calendars, lists, and devices you own or have permission to manage. respect skylight's terms and infrastructure.

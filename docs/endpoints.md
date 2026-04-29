# endpoint notes

unofficial, not affiliated with skylight. payload shapes are inferred from the web bundle and verified only where explicitly noted. mutating calls should be used only on accounts/devices you own or are authorized to manage.

## generic escape hatch

`skylight api METHOD path --body '{...}' --yes`

all mutating cli commands require `--yes`. use `--dry-run` to verify intent without sending.

## resources covered by typed client methods

- user: get, update, profile update, push/marketing toggles, export, delete
- frame: get, update, rename, hide, activation code, household config get/update
- users/access: list, add, approve, block
- devices: list, get, update, reset, delete, activation code, alarms create/update/delete
- categories: list, get, create, find-or-create, update, delete, family member update
- calendar accounts/events: list accounts, get/update account, recent invited emails, events get/create/update/delete, event notification settings get/update
- source calendars/webcal: list/get/create/update/delete source calendars, set default sync-back source calendar, list/create webcal accounts
- lists/list_items: list/get/create/update/delete lists, list/create/update/delete/move/section/bulk-delete list items
- chores: get, create multiple, update, complete, delete
- task box: list, create, update, delete
- rewards: list/get/create/update/delete, points get/update, redeem/unredeem
- meals: categories list/update, recipes list/get/create/update, add recipe to grocery list
- albums/messages: albums list/get/create/update/delete/add/remove/message ids, messages list/get/delete/caption/likes/comments/bulk delete
- auto creation intents: list/get/create/retry/approve/undo/created items
- month in review: get

## safe probe strategy

verified live with disposable objects:

- list create -> list item create -> list item update -> list item delete -> list delete
- task box item create -> update -> delete

not yet live-probed because they may affect family data, external auth, devices, photos, calendars, or rewards:

- devices reset/delete/activation
- users add/approve/block
- calendar event/source calendar/webcal mutations
- chores create/complete/delete
- rewards/reward points/redeem
- meal recipe add to grocery list
- albums/messages/photo/comment/like mutations
- auto creation intent approve/undo


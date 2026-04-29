# security

never commit skylight credentials, tokens, frame ids for private frames, or exported api responses containing personal data.

recommended credential storage:

1. 1password item named `Skylight API`
2. fields: `username`, `password`, `frame_id`
3. run with `SKYLIGHT_1PASSWORD_ITEM="Skylight API" skylight smoke --readonly`

if you find a security issue in this project, do not open a public issue with secrets or exploit details. contact the maintainer privately first.

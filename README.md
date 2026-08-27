# Sims Hub

A small server-backed toolbox for The Sims 4: a wheel of names, a random number
generator, a sim generator, a random pack picker and a "Super Sim" completion
tracker. State lives in named profiles on the server, so the same data is
available from a phone and a desktop without syncing anything by hand.

The interface is in Czech; code, configuration and documentation are in English.

## Features

- **Wheel of names** — one entry per line, weighted entries (`Pizza x3`), saved
  lists, optional tick sound, last 20 winners.
- **Random number** — range, count, no-repeat and sort options, clipboard copy,
  last 20 rolls. All randomness comes from `crypto.getRandomValues` with
  rejection sampling, never modulo.
- **Sim generator** — gender, age, three non-conflicting traits, aspiration,
  career, weighted occult type and optional favourites. Every category can be
  switched off or locked so it survives the next roll.
- **Random packs** — pick from the packs you own, optionally one per category,
  with per-category weights.
- **Super Sim tracker** — aspirations, skills, careers, degrees and occult
  progress with per-section and overall progress bars, search, age filter and
  collapsible sections.

Profiles are just named data sets. There is no login: anyone who can open the
URL sees every profile, which is why this is meant for a private network rather
than the public internet.

## Running it

```sh
docker compose up -d --build
```

Then open `http://<host>:8105/`.

Without Docker:

```sh
npm ci
npm start           # listens on PORT, 8000 by default
```

## Configuration

Every variable has a default, so the service also starts without a `.env` file.
Copy `.env.example` to `.env` to override any of them.

| Variable | Default | Meaning |
| --- | --- | --- |
| `SIMSHUB_PORT` | `8105` | Host port the container is published on |
| `SIMSHUB_UID` / `SIMSHUB_GID` | `1000` | User the container runs as; must own `./data` |
| `PORT` | `8000` | Port inside the container |
| `SIMSHUB_DB_PATH` | `/data/simshub.db` | SQLite file location inside the container |

## Data on disk

The only thing written to disk is one SQLite database:

- inside the container: `/data/simshub.db`
- on the host: `./data/simshub.db`, because `./data` is bind-mounted

To back it up, stop the container and copy `data/simshub.db` (plus the
`-wal` and `-shm` files if they exist, or copy while stopped to avoid them).
Restoring is the same copy in reverse. The container is otherwise disposable.

If `./data` ends up owned by root, the container cannot write to it. Fix it with
`sudo chown -R 1000:1000 data` or set `SIMSHUB_UID` / `SIMSHUB_GID` to match the
directory owner.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health probe used by the container healthcheck |
| `GET` | `/api/profiles` | List profiles (`id`, `name`, `updated_at`) |
| `POST` | `/api/profiles` | Create a profile from `{ name }` |
| `GET` | `/api/profiles/:id` | Read one profile including its data blob |
| `PATCH` | `/api/profiles/:id` | Update `name` and/or `data` |
| `DELETE` | `/api/profiles/:id` | Delete a profile |
| `GET` | `/api/profiles/:id/export` | Download the profile as JSON |
| `POST` | `/api/profiles/import` | Create a profile from `{ name, data }` |

The whole tool state is stored as a single JSON blob per profile (max 5 MB); it
is read and written as a whole. The client keeps that blob in memory during a
session, debounces writes by one second and retries in the background when the
server is unreachable, so the tools keep working offline and re-sync afterwards.
Last write wins: when a profile changed elsewhere, the client shows a notice
with a reload button instead of merging.

The blob carries a `schemaVersion` field so its shape can be migrated later
without losing data.

## Content data

Pack, generator and tracker content lives in `public/data/*.json` and is served
as static files:

- `packs.json` — every pack with its category (and kit subtype)
- `simgen.json` — traits with conflicts, aspirations, careers, occult weights
- `supersim.json` — tracker sections and items

Sections of `supersim.json` that are known to be incomplete are marked with
`"incomplete": true` and a note, and the UI says so instead of pretending the
list is exhaustive. Adding items is a matter of editing the JSON — no build step
is involved anywhere in this project.

## Disclaimer

This is an unofficial fan-made tool. It is not affiliated with, endorsed by or
associated with Electronic Arts or Maxis. The Sims is a trademark of Electronic
Arts Inc.

## License

Released under the MIT License — see [LICENSE](LICENSE).

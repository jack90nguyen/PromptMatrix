# Prompt Matrix

A library of small, reusable prompt fragments. Filter by category + tags and the
app stitches the matching fragments into one complete prompt, ready to paste into
an AI tool for text / image / video generation.

## How composition works

Pick a category, then pick tags. A fragment is pulled in when:

- it is a **base fragment** (`isBase`) - always included for its category, or
- **OR mode** (default): it carries at least one of the selected tags, or
- **AND mode**: it carries every selected tag.

Matching fragments are ordered by `sortOrder`, then title, and their bodies are
joined with a blank line. Individual fragments can be unchecked before copying.

## Screens

**Composer** opens on the *matrix*: a category x tag grid where each cell is the
number of fragments at that intersection, plus a `Base` column. Clicking a cell
selects that category and narrows to that tag, so the grid doubles as an
overview of where the library is thick or thin. Below it sit the category
picker, tag chips with an OR/AND switch, the fragment checklist, and the
composed output.

**Prompts** opens on a force-directed graph of the library:

- a **category** is a filled circle, sized by how many prompts it holds
- a **prompt** is a small circle in its category's colour, ringed amber when it
  is a base fragment and faded when inactive
- a **tag** is a hollow diamond

Prompts link to their category (solid) and to every tag they carry (dashed).
Two prompts from different categories that share a tag therefore meet at that
tag node - two different colours converging on one diamond is exactly the
cross-category overlap the view exists to show. Prompts are never linked to each
other directly: a tag on N prompts would cost N(N-1)/2 edges that way, against N
through a tag node.

Drag nodes, scroll to zoom, drag the background to pan; hovering dims everything
unconnected. Clicking a prompt opens it, clicking a category or tag filters to
it. The sliders change the live simulation.

`?view=cards` switches to a measured masonry of cards, each showing the start of
the body. Both views share the same filters - category, tags (OR/AND), free
text, status, base-only - and every filter lives in the URL, so a view can be
bookmarked or shared.

**New / edit prompt** can create a category or a tag in place: the `+ New
category` and `+ New tag` links write the row immediately and select it, so
adding a fragment never sends you to another screen. An abandoned form can
therefore leave an unused category or tag behind; both are deletable.

## Stack

- Next.js (App Router) + React + TypeScript
- PostgreSQL + Prisma 7 (via the `@prisma/adapter-pg` driver adapter)
- Tailwind CSS v4, dark-only theme (tokens in `src/app/globals.css`)
- `d3-force` for the graph layout; zoom, pan and node dragging are hand-rolled
- Auth: username + password in the database, signed JWT session cookie (`jose`),
  passwords hashed with `scrypt`

## Setup

```bash
npm install
cp .env.example .env      # then fill in the values
npx prisma generate       # the generated client is git-ignored
npm run db:migrate        # create the schema (see the note below)
npm run db:seed           # create the admin user + sample data
npm run dev
```

### Migrations without CREATEDB

`prisma migrate dev` needs a shadow database, so it fails with `P3014` when the
database role cannot create databases. Two ways out:

**Preferred** - grant the privilege once, as a superuser, then use `npm run db:migrate`:

```sql
ALTER ROLE your_app_role CREATEDB;
```

**Without any extra privilege** - diff the live database against the schema:

```bash
npm run db:migrate:create -- add_something   # writes prisma/migrations/<stamp>_add_something
# read the SQL it prints
npm run db:migrate:apply -- prisma/migrations/<stamp>_add_something
```

This still produces real migration files, so `npm run db:deploy` works in
production. Because the diff comes from the live database rather than from the
migration history, a column *rename* appears as `DROP` + `ADD` - which loses
data. Always read the SQL before applying it.

### Environment

| Variable         | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string                             |
| `SESSION_SECRET` | JWT signing key - `openssl rand -hex 32`                 |
| `ADMIN_USERNAME` | Bootstrap admin, created by `npm run db:seed`             |
| `ADMIN_PASSWORD` | Bootstrap admin password                                  |

`db:seed` is idempotent: it upserts the admin and only inserts sample data when
no categories exist yet.

## Scripts

| Script              | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Dev server                                    |
| `npm run build`     | Production build (webpack - see below)        |
| `npm run start`     | Serve the production build                    |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run db:migrate`| `prisma migrate dev` (needs CREATEDB)         |
| `npm run db:migrate:create` | Write a migration by diffing the live DB |
| `npm run db:migrate:apply`  | Apply and record a written migration     |
| `npm run db:deploy` | `prisma migrate deploy` (production)          |
| `npm run db:seed`   | Seed admin + sample data                      |
| `npm run db:studio` | Prisma Studio                                 |

Prisma is configured in `prisma7.config.ts` (Prisma 7 keeps the datasource URL
there, not in `schema.prisma`) and talks to PostgreSQL through the
`@prisma/adapter-pg` driver adapter. The generated client lands in
`src/generated/prisma` and is git-ignored.

`AGENTS.md` and `CLAUDE.md` at the repo root are generated by Next.js; set
`agentRules: false` in `next.config.ts` to stop that.

## Roles

- `ADMIN` - everything, including user management
- `EDITOR` - composer, prompts, categories, tags

Every prompt records `updatedById`, so the list and edit screens show who last
edited it.

## HTTP API

One read-only endpoint composes a prompt outside the UI, for n8n, Make, a
spreadsheet, or a shell script. It runs the same `selectFragments` /
`composePrompt` used by the composer, so the API and the screen can never drift
apart.

```
GET /api/compose
  key       required   API key (or send `Authorization: Bearer <key>`)
  category  required   category slug
  tags      optional   comma-separated tag slugs
  mode      optional   OR (default) or AND
  format    optional   json (default) or text
```

```bash
curl "https://HOST/api/compose?key=pm_xxxxxxxx_...&category=product&tags=mug,upload-photo"
curl -H "Authorization: Bearer pm_xxxxxxxx_..." \
  "https://HOST/api/compose?category=product&tags=mug&format=text"
```

`format=json` returns the composed prompt plus the fragments that went into it;
`format=text` returns `text/plain` and nothing else. Errors are
`401` (missing / invalid / revoked key), `404` (unknown category) and `400`
(bad `mode` or `format`, missing `category`).

Only active prompts are visible to the API, exactly as in the composer.

### API keys

Admins create and revoke keys under **API keys**. A key looks like
`pm_<8 hex>_<48 hex>`; the database stores its SHA-256 digest and a display
prefix, never the key, so it is shown once at creation and cannot be recovered.
Each call stamps `lastUsedAt`, which is what the list screen shows.

A key passed in the query string is recorded by access logs, browser history,
`Referer` headers and any proxy in between. The endpoint accepts an
`Authorization: Bearer` header for callers that can send one. Revoking a key
takes effect on the next request.

**There is no rate limiting.** A leaked key can read the whole prompt library as
fast as it likes, so treat `lastUsedAt` as the tripwire and revoke on suspicion.

## Why the build uses webpack

`npm run build` passes `--webpack`, overriding the Turbopack default. A
Turbopack production build externalises `pg` and `@prisma/client` under
content-hashed specifiers - `pg-587764f78a6c7a9c` and the like - which only
resolve against the exact `node_modules` tree that existed when the build ran.
Deployment builds locally and ships `.next` to a server carrying its own
prod-only tree, so those specifiers are unresolvable there and every
database-backed route answers 500. The webpack build requires `pg` and
`@prisma/client` by plain name, which resolves anywhere.

Symptom if this is ever reverted: `Cannot find module 'pg-<hash>'` in the pm2
log, `/login` fine, everything else 500.

## Importing from Lark Base

The CS ticket playbook lives in a Lark Base and is pulled in by
`scripts/import-lark-tickets.ts`:

```bash
npx tsx scripts/import-lark-tickets.ts --dry-run   # report only
npx tsx scripts/import-lark-tickets.ts             # write
```

Source is the "Ticket AI Label" table of base `MZ1NbE0H9acwOZsFfscj4SuSpuh`,
read through `lark-cli` with the bot identity. Nothing is written back to Lark.

Mapping: `Case` becomes the title, `AI Label` becomes the prompt's single tag,
`Action tiếp theo` and `Template` are joined into the body under `Next action:`
and `Template:` headings - they are an internal instruction and a
customer-facing reply respectively, and running them together reads as if the
instruction were part of the reply. A row with neither falls back to
`Nội dung đầy đủ`. Everything lands in the existing `Ticket Label` category.

The importer matches on (category, title), so re-running it after the Base
changes updates bodies and tags instead of duplicating rows. Tags named in the
Base are created on demand.

Note the CLI exposes no page token, so the importer reads a single page of 200
rows and fails loudly if the table has outgrown that.

## Notable pieces

- `src/lib/compose.ts` - fragment selection and joining. Pure functions.
- `src/lib/matrix.ts` - category x tag aggregation. Pure functions.
- `src/components/Masonry.tsx` - measures card heights and packs them into the
  shortest column, which keeps reading order roughly row-major. CSS `columns`
  fills column-by-column and would scramble that order.
- `src/lib/graph.ts` - turns the prompt list into graph nodes and edges. Pure
  functions.
- `src/app/(app)/manage/prompts/PromptGraph.tsx` - the simulation. Positions are
  written to the DOM on each tick rather than through React state, which is what
  keeps hundreds of nodes at 60fps.
- `src/lib/api-key.ts` - key generation and digesting.
- `src/proxy.ts` - session guard. Note that `/api` is excluded from its matcher,
  so any route added under `/api` must authenticate itself.

## Known limits

- The prompt list shows the first 200 matches; narrow the filters to see more.
- The graph is drawn with SVG and caps at 500 prompt nodes, saying so on screen
  when it trims. Past that it needs a canvas renderer with manual hit-testing.
- Categories with no prompt in the current filter are left out of the graph: an
  isolated node carries no information.
- The matrix widens with the number of tags in use. It scrolls horizontally with
  the category column pinned, but past a few dozen tags it stops being readable.
- The matrix counts by walking every active prompt. Past ~10k prompts, move the
  counting into SQL (see the TODO in `src/lib/matrix.ts`).
- The API has no rate limiting and keys carry no scope or expiry: every key can
  read every category.
- Sessions are stateless JWTs, so disabling a user does not kill an already-open
  session until the token expires (7 days).
- A prompt belongs to exactly one category. Composing across several categories
  at once is not implemented yet.

# tutorial-nestjs

NestJS tutorial project — a RealWorld / Medium clone backend API, built with
[NestJS](https://nestjs.com).

## Requirements

- Node.js 22+
- npm
- Docker (for PostgreSQL + Redis, from Pull 2 onward)

## Setup

```bash
npm install
cp .env.example .env
```

## Running the app

```bash
# development (watch mode)
npm run start:dev

# production mode
npm run start:prod
```

The API listens on `http://localhost:3000` by default (see `PORT` in `.env`).

## API docs

Swagger UI is available at `http://localhost:3000/api-docs` while the app is running.

## Internationalization

Responses support `en` (default) and `vi`, resolved from (in order of priority):
`?lang=` query param, `x-lang` header, or the `Accept-Language` header.

## Testing

```bash
npm run test       # unit tests
npm run test:e2e   # e2e tests
npm run test:cov   # unit test coverage
npm run test:e2e:cov  # e2e test coverage
```

`test:e2e` runs against a **separate database** (`.env.test`, `DB_NAME=nestjs_tutorial_test`
by default), never the dev DB from `.env` — first-time setup needs the test DB's schema
created once:

```bash
npm run migration:run:test
```

Every e2e test case runs against a freshly seeded + truncated database (see
`test/utils/reset-database.setup.ts`), and the suite always runs with `--runInBand`
(serial, not parallel) since truncation is a whole-database operation.

## Linting & code standards

```bash
npm run lint           # eslint . --fix        (local, auto-fixes)
npm run format         # prettier --write .    (local, auto-fixes)
npm run lint:check     # eslint .              (no --fix — what CI runs)
npm run format:check   # prettier --check .    (no --write — what CI runs)
npm run lint:sunlint   # Sunlint (local only, not available on CI)
```

Both gates cover the **whole repo** (root `*.ts`, `*.json`, `*.yml`, `*.md`), with
exclusions declared in `.prettierignore` and the `ignores` block of `eslint.config.mjs`.
CI only ever runs the `:check` variants, so a formatting error fails the build instead of
being silently auto-fixed. All text files are LF-only, enforced by `.gitattributes`.

This project also requires [Sunlint](https://coding-standards.sun-asterisk.vn/docs/installation/)
to be run locally before opening a PR — see [CONTRIBUTING.md](./CONTRIBUTING.md).
Coding conventions live in [CODING_STANDARD.md](./CODING_STANDARD.md).

## Project structure

```
src/
  main.ts              # bootstrap: configureApp() → Swagger → listen
  app.module.ts        # root module (config, TypeORM, i18n, feature modules)
  common/              # cross-domain: bootstrap/, decorators/, filters/, utils/
  config/              # env.validation.ts (Joi), typeorm.config.ts
  database/migrations/ # TypeORM migrations (synchronize is off)
  i18n/                # en/vi translation files
  redis/               # global infra module (token blacklist)
  modules/             # feature modules by domain
    auth/              # register, login, logout, JWT strategy + guards
    users/             # user CRUD, avatar update
    follows/           # follow/unfollow relation
    profiles/          # public profile (user + following status)
    attachments/       # uploaded file storage & serving
    articles/          # article CRUD, slug, tags, list/feed filters
    favorites/         # article favorite/unfavorite relation
    comments/          # add/list/delete comments on an article
test/                  # e2e tests + shared test utils
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming, commit message,
and PR review conventions used in this repo.

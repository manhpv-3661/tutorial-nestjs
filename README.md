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
npm run test:cov   # coverage
```

## Linting & code standards

```bash
npm run lint
```

This project also requires [Sunlint](https://coding-standards.sun-asterisk.vn/docs/installation/)
to be run locally before opening a PR — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Project structure

```
src/
  app.controller.ts   # hello-world endpoint
  app.module.ts        # root module (i18n setup)
  app.service.ts
  i18n/                # en/vi translation files
  main.ts              # bootstrap, Swagger setup
test/                   # e2e tests
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming, commit message,
and PR review conventions used in this repo.

# Contributing

## Branch naming

`feature/pull-<n>-<slug>`, one branch per pull in the tutorial roadmap, e.g.
`feature/pull-1-init-i18n-swagger`, `feature/pull-2-migration-auth`.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `<type>: <description>`,
lowercase, imperative mood.

Types used in this repo: `feat`, `fix`, `ci`, `docs`, `chore`, `test`, `refactor`.

## Pull request workflow

1. Create a branch off `main` following the naming convention above.
2. Open a PR against `main` once the pull's scope is done.
3. Request a GitHub Copilot review; address all comments.
4. Self-review the diff.
5. Run `sunlint --all --input=src` locally, fix all `error`-level findings,
   and attach the result as a PR comment.
6. Get at least one APPROVED review from a teammate.
7. Merge only after approval.

Never commit directly to `main`.

## Code standards

- [Sunlint](https://coding-standards.sun-asterisk.vn/docs/installation/) — mandatory,
  all `error`-level rules must be fixed before requesting a mentor review.
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) — reference.

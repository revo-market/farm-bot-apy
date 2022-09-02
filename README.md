# farm-bot-apy

Calculate the APY of a farm bot.

## Type Checking

This project uses [TypeScript](https://www.typescriptlang.org/). It's recommended to get TypeScript set up for your editor to get a really great in-editor experience with type checking and auto-complete. To run type checking across the whole project, run `yarn typecheck`.

## Testing

For lower level tests of utilities and individual modules, we use [Jest](https://jestjs.io).

## Linting

This project uses [ESLint](https://eslint.org/) for linting. That is configured in [`.eslintrc.js`](.eslintrc.js).

## Formatting

We use [Prettier](https://prettier.io) for auto-formatting. It's recommended to install an editor plugin (like the [VSCode Prettier plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)) to get auto-formatting on save. There's also a `yarn format` script you can run to format all files in the project.

## GitHub Actions

We use [GitHub Actions](https://docs.github.com/en/actions) for continuous integration and deployment (CI/CD). Anything that gets into the `main` branch will be deployed using `yarn deploy` after running tests/build/etc.

## Renovate

[Renovate](https://renovatebot.com/) ensures our dependencies are kept up to date. It's configured with our shared config in [`renovate.json5`](renovate.json5).

## Release

New versions of `farm-bot-apy` are released to NPM automatically when PR's are merged to `main`. Remember to use conventional commits
so that `semantic-release` can parse your commit messages and update version numbers appropriately.

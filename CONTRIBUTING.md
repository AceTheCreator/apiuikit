# Contributing to apiuikit

Thanks for contributing. This guide covers how to set up the monorepo, run local tooling, and open a pull request.

## Prerequisites

- **Node.js 22+**
- **npm** (workspaces are configured in the root `package.json`)

## Setup

```bash
git clone https://github.com/AceTheCreator/apiuikit.git
cd apiuikit
npm install
```

All commands below run from the **repo root** unless noted otherwise.

## Repository structure

```
packages/
  lib/            # React component library (published as "apiuikit" on npm)
  web-component/  # Custom elements (published as "@apiuikit/web-component" on npm)
  playground/     # Playground that consumes the library like a real app ->[playground.apiuikit.com](https://playground.apiuikit.com)
  x-tensions/     # Catalog of x-* extension renderers, bundled into lib (not published)
```

## Development workflows

### Library (`packages/lib`)

```bash
npm run build:lib    # build → packages/lib/dist/
npm run storybook    # Storybook on http://localhost:6006
npm run test         # Vitest (lib)
npm run test:watch   # Vitest watch mode
```

For interactive work against a real consumer, use the [playground](#playground). Storybook is the place for isolated component stories.

Lint and typecheck (same gates as CI):

```bash
npm run lint --workspace=packages/lib
npm run typecheck --workspace=packages/lib
```

### Playground

```bash
npm run playground
```

This builds `packages/lib` once, then runs the library watcher and the playground Vite server together. Library edits rebuild `packages/lib/dist/`; the playground reloads automatically when that build finishes.

For how the rebuild → reload loop works (and gotchas), see [packages/playground/DEVELOPMENT.md](./packages/playground/DEVELOPMENT.md).

### Web components

```bash
npm run build:web-component   # builds lib, then packages/web-component → dist/
npm run demo:wc               # builds both, then serves packages/web-component/demo/
                              # on :8735 to preview all the webcomponents
```

`@apiuikit/web-component` depends on the workspace `apiuikit` package and bundles it (plus React / ReactDOM) into a self-contained build.

Lint and typecheck:

```bash
npm run lint --workspace=packages/web-component
npm run typecheck --workspace=packages/web-component
```

### Spec extensions (`packages/x-tensions`)

Internal only — bundled into `apiuikit` at build time. See [packages/x-tensions/README.md](./packages/x-tensions/README.md) for adding a new `x-*` renderer.

## Pull requests

1. Fork and create a branch from `master`.
2. Make your change; keep the PR focused.
3. Run what CI will run before opening the PR:
   ```bash
   npm run lint --workspace=packages/lib
   npm run typecheck --workspace=packages/lib
   npm run test
   npm run build:lib
   # if you touched web components:
   npm run lint --workspace=packages/web-component
   npm run typecheck --workspace=packages/web-component
   npm run build:web-component
   ```
4. Open a PR against `master`. Describe *why* the change exists and how you verified it.
5. If the change affects a published package (`apiuikit` or `@apiuikit/web-component`), add a changeset:
   ```bash
   npm run changeset
   ```
   Follow the prompts (which package, bump type, short summary). Commit the generated file under `.changeset/`.

Playground is private and ignored by changesets — no changeset needed for playground-only edits. Whatever apiuikit is in master branch is deployed on playground.

## Releases (maintainers)

Releases use [changesets](https://github.com/changesets/changesets). Merging to `master` opens or updates a **Version Packages** PR when changeset files are pending. Merging that PR runs the `release` GitHub Action, which builds and publishes packages with pending version bumps.

You can also publish a package manually from `packages/lib/` or `packages/web-component/`:

```bash
npm publish   # runs prepublishOnly (build) then publishes
```

Prefer the changesets flow so versions and changelogs stay consistent.

## Docs

Consumer-facing docs live under [`docs/`](./docs/). Update them when you change public APIs, props, or usage patterns. Also submit a pr to https://github.com/apiuikit/apiuikit-website to update the docs in the hosted doc website.

## Questions / bugs

- Bugs and feature requests: [GitHub Issues](https://github.com/AceTheCreator/apiuikit/issues)
- Website: [apiuikit.com](https://apiuikit.com)
- Playground: [playground.apiuikit.com](https://playground.apiuikit.com)
- Website: [apiuikit.com](https://apiuikit.com)

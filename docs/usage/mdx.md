# MDX and Docusaurus

## Overview

apiuikit's components are plain React components, so they work in MDX the same way they work in a `.tsx` file: import them and render them between your paragraphs. The [singular components](./sections.md#rendering-a-single-item) (`OpenAPIEndpoint`, `AsyncAPIOperation`, `AsyncAPIMessage`, `Schema`) suit guide pages best. They render one item inline, next to the prose that explains it.

Everything renders on the server too, so static site generators (Docusaurus, Next.js, Astro) put the endpoint and schema content into the HTML at build time, where search engines and site search can index it.

A complete Docusaurus site using everything on this page lives in the [examples repository](https://github.com/apiuikit/examples/tree/main/docusaurus-demo).

## Plain MDX

```mdx
import 'apiuikit/style.css';
import { OpenAPIEndpoint, Schema } from 'apiuikit';
import petstore from './petstore.json';

# Listing pets

Start by fetching the pets that are already in the store:

<OpenAPIEndpoint document={petstore} operationId="listPets" />

Each pet looks like this:

<Schema document={petstore} name="Pet" />
```

The stylesheet only needs importing once per page, or once for the whole site (see below). It's scoped to apiuikit's own root element, so it doesn't restyle the rest of your site.

## Docusaurus



### Use the components without importing them

To make the components available in every `.mdx` file, add them to Docusaurus's MDX component map by [swizzling](https://docusaurus.io/docs/markdown-features/react#mdx-component-scope) `MDXComponents`. This is also the one place to import the stylesheet:

```tsx
// src/theme/MDXComponents.tsx
import MDXComponents from '@theme-original/MDXComponents';
import 'apiuikit/style.css';
import { OpenAPIEndpoint, AsyncAPIOperation, AsyncAPIMessage, Schema } from 'apiuikit';

export default {
  ...MDXComponents,
  OpenAPIEndpoint,
  AsyncAPIOperation,
  AsyncAPIMessage,
  Schema,
};
```

A page then only imports its spec:

```mdx
import petstore from '@site/specs/petstore.json';

<OpenAPIEndpoint document={petstore} operationId="listPets" />
```



### Follow the site's dark mode

apiuikit has its own `theme.mode` (see [Configuration](../configuration/config.md)). It doesn't know about Docusaurus's navbar toggle, so pass the site's color mode in. Wrap each component once and register the wrapped versions in `MDXComponents.tsx` instead:

```tsx
// src/components/apiuikit.tsx
import { useMemo, type ComponentType } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import * as apiuikit from 'apiuikit';
import type { ConfigInterface } from 'apiuikit';

function withSiteColorMode<P extends { config?: ConfigInterface }>(Component: ComponentType<P>) {
  return function Themed(props: P) {
    const { colorMode } = useColorMode();
    const config = useMemo<ConfigInterface>(
      () => ({ ...props.config, theme: { ...props.config?.theme, mode: colorMode } }),
      [props.config, colorMode],
    );
    return <Component {...props} config={config} />;
  };
}

export const OpenAPIEndpoint = withSiteColorMode(apiuikit.OpenAPIEndpoint);
export const Schema = withSiteColorMode(apiuikit.Schema);
// ...and any other component you use
```

`useColorMode()` reports the default mode until the page has hydrated, then the visitor's real choice, so this never causes a hydration mismatch.

### The full reference

`<OpenAPI />` and `<AsyncAPI />` also work on a docs page. Docusaurus's navbar is sticky and 60px tall, so pass `topOffset` to keep apiuikit's sticky elements below it, and hide Docusaurus's own table of contents to give the reference more width:

```mdx
---
hide_table_of_contents: true
---

import petstore from '@site/specs/petstore.json';

<OpenAPI openapi={petstore} config={{ topOffset: 60 }} />
```



### Specs in YAML

Docusaurus imports `.json` files out of the box. For a YAML spec, either convert it to JSON as a build step, or add a YAML loader with a small [plugin](https://docusaurus.io/docs/api/plugin-methods/lifecycle-apis#configureWebpack) (for example `yaml-loader` in `configureWebpack`).



## Next.js and other React Server Components setups

MDX pages in the Next.js App Router are server components, and apiuikit's components use React state, so they have to be client components. Re-export the ones you use from a file marked `'use client'`, and import from that file in your MDX:

```tsx
// components/apiuikit.tsx
'use client';
export { OpenAPIEndpoint, Schema } from 'apiuikit';
```

They still render on the server for the initial HTML. `'use client'` only marks where the client bundle begins.

## Notes

- Several components on one page each resolve their document on their own. To share one resolved document between several sections, wrap them in `OpenAPIProvider` or `AsyncAPIProvider` (see [Composable Sections](./sections.md#composing-several-sections)).
- The single-item components (`OpenAPIEndpoint`, `OpenAPIWebhook`, `AsyncAPIOperation`, `AsyncAPIMessage`, `Schema`) render just their card: no outer margin and no background around it. The list sections (`OpenAPIEndpoints`, `OpenAPIWebhooks`, `AsyncAPIOperations`, `AsyncAPIMessages`, `Schemas`) also paint no background around their table. Space these components like the rest of your content. In Docusaurus, for example:

  ```css
  /* src/css/custom.css */
  .markdown > .apiuikit-root {
    margin-bottom: var(--ifm-leading);
  }
  ```

- Headings inside apiuikit's components don't appear in Docusaurus's "On this page" table of contents. Only Markdown headings in the MDX file do, so put a `##` heading before each component you want listed.
- During server rendering, raw HTML inside your spec's descriptions is rendered as plain text. Once the page hydrates, the HTML is sanitized with DOMPurify and rendered as usual.


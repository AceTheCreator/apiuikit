---
"apiuikit": minor
"@apiuikit/web-component": patch
---

Support MDX and static site generators such as Docusaurus. See the new [MDX and Docusaurus](https://github.com/AceTheCreator/apiuikit/blob/master/docs/usage/mdx.md) guide.

- Replace `isomorphic-dompurify` with `dompurify`. The server variant of `isomorphic-dompurify` pulls in jsdom, which can't be bundled, so Docusaurus builds failed with `ENOENT ... default-stylesheet.css`. It also drops jsdom from every install. Server rendering now produces Markdown whose raw HTML is reduced to escaped text, and DOMPurify sanitizes the full HTML in the browser after hydration. Client-only apps render exactly as before.
- Markdown links with `javascript:`, `data:` or other non-web URL schemes render as plain text, and inline Markdown inside link text (`[**bold**](...)`) now renders.
- `theme.mode: "system"` no longer causes a hydration mismatch for visitors whose OS prefers dark mode.
- Remove an unused `@layer` statement from `style.css`. clean-css (the CSS minifier in Docusaurus's webpack build) misparsed it and silently dropped apiuikit's scoped `box-sizing`/`border`/`margin` reset.
- The single-item components (`OpenAPIEndpoint`, `OpenAPIWebhook`, `AsyncAPIOperation`, `AsyncAPIMessage`, `Schema`) no longer add a 24px top and bottom margin or paint a page background around their card, which showed as a colored band when embedded in a page with a different background. They now render just the card, so add your own spacing between it and surrounding content if you relied on the old margin.
- Rendered on their own (outside a provider), the list sections (`OpenAPIEndpoints`, `OpenAPIWebhooks`, `AsyncAPIOperations`, `AsyncAPIMessages`, `Schemas`) no longer paint a page background around their table, so the area around the "Expand all" toggle and below the table shows the host page's background.
- Tables (endpoints, webhooks, operations, messages) now reset `display`, row backgrounds and header-cell colors inside apiuikit. Host CSS such as Docusaurus's `table { display: block }` made them shrink to their content instead of filling their bordered box, and striped every other row.

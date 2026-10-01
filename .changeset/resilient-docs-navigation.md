---
"apiuikit": minor
---

Render usable OpenAPI and AsyncAPI content despite validation errors, with a shorter quick-nav rail and consistent section spacing on narrow layouts.

Changed:

- OpenAPI and AsyncAPI parser entry points now retain usable documents when validation reports errors. Diagnostics continue through `onDiagnostics` or the imperative helper's returned `diagnostics`, so consumers control their presentation without a built-in validation panel. Unreadable input, unsupported documents, or failures that prevent a usable document from being produced still return no view.
- OpenAPI preserves the decoded document when reference resolution fails and reports the errors. AsyncAPI continues applying operation traits, resolving references, and converting Avro and Protobuf schemas when validation errors are allowed.
- Render errors in content sections are contained so other sections remain accessible; OpenAPI operation details also have their own fallback. Error boundaries retry when the document or selected content changes. The exported `ErrorBoundary` accepts an optional `resetKey` to support this recovery in consumer integrations.
- The desktop quick-nav rail is capped at 240px tall (and still never more than 70% of the viewport). It used to scale with the viewport, so a long document on a tall screen grew it to over a hundred ticks — about 700px of rail that read more like a scrollbar than a table of contents. It now tops out at roughly two dozen item ticks; past that, each tick stands for a run of items, the active one still highlights, and larger sections still get more ticks than smaller ones.
- The rail now sits 12px from the widget's left edge, Notion-style, instead of against the content column. On an ultra-wide screen it stays out by the frame rather than beside the content. The point where it hands over to the floating button is unchanged: the rail still needs 48px of clearance from the content column.

Fixed:

- Missing OpenAPI metadata and malformed parameter lists no longer automatically blank otherwise usable documentation. A missing or non-string `info.version` is reported rather than silently accepted through the parser's default value.
- Below the `@lg` breakpoint, the gap between the Servers section and the content tabs was 88px against 48px on large screens, from a mobile-only top margin on the tab bar. It is now 48px at every width.
- A section with no side content still rendered its empty side column on narrow layouts, where the section's `gap-6` gave it 24px of space. That padded the space under the content tabs (56px against 32px on large screens, above the endpoints list and its "Expand all" toggle) and under every other section without side content. The empty column is now hidden below `@lg`; from `@lg` up it still reserves the right gutter.

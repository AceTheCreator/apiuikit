---
"apiuikit": minor
---

Add Arazzo support. `<Arazzo>` and `<ArazzoRenderer>` render Arazzo 1.0.x and 1.1.x workflows, with each step showing the OpenAPI operation it calls. Source documents come from the `sources` prop, a `loadSource` callback, or their `url`. Also adds section components (`ArazzoProvider`, `ArazzoInfo`, `ArazzoWorkflows`, `ArazzoWorkflowSection`), Markdown export, and `parseArazzoDocument` / `resolveArazzoDocument`. Reading Arazzo text needs the new optional peer `@usearazzo/parser`; apps that don't use Arazzo don't load any of its code.

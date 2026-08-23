---
"@apiuikit/web-component": minor
---

Add standalone, modular custom elements. Full-document elements (`<apiuikit-asyncapi>`, `<apiuikit-asyncapi-renderer>`, `<apiuikit-openapi>`, `<apiuikit-openapi-renderer>`) and nine new per-section elements — `<apiuikit-asyncapi-servers>`, `-operations`, `-messages`, `-info`, the OpenAPI equivalents `<apiuikit-openapi-servers>`, `-endpoints`, `-webhooks`, `-info`, and a single `<apiuikit-schemas>` shared by both spec types (`components.schemas` is the same shape on both) — each register independently via a matching subpath import (e.g. `@apiuikit/web-component/asyncapi-operations`), so consumers only register the element(s) they actually use. The default `@apiuikit/web-component` entry still registers everything, for backward compatibility.

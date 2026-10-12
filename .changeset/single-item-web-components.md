---
"@apiuikit/web-component": minor
---

Add single-item elements that embed one item inline, mirroring the React single-item sections: `<apiuikit-openapi-endpoint>` (by `operation-id`, or `method` + `path`), `<apiuikit-openapi-webhook>` (by `name`, optional `method`), `<apiuikit-asyncapi-operation>` (by `operation-id`), `<apiuikit-asyncapi-message>` (by `message-id`), and the spec-agnostic `<apiuikit-schema>` (by `name`). Each is also available as its own subpath import (e.g. `@apiuikit/web-component/openapi-endpoint`). The endpoint and webhook elements accept an `onNavigate` property for following response links to other operations.

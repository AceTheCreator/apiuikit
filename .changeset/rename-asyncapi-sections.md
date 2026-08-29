---
"apiuikit": minor
---

Rename the standalone AsyncAPI section exports to carry an `AsyncAPI` prefix, matching the existing OpenAPI equivalents: `Servers` → `AsyncAPIServers`, `Operations` → `AsyncAPIOperations`, `Messages` → `AsyncAPIMessages`, `Schemas` → `AsyncAPISchemas`, `Info` → `AsyncAPIInfo`. The old generic names were easy to confuse with their OpenAPI counterparts (`OpenAPIServers`, `OpenAPIInfo`, etc.); update imports from `apiuikit` accordingly.

# apiuikit

## 1.1.0

### Minor Changes

- 75f3f1e: Wrap the OpenAPI render tree in an error boundary, matching AsyncAPI. `OpenAPI` and `OpenAPIRenderer` now accept `errorFallback` and `onError`, so a render-time throw from a malformed document is contained by the library instead of escaping into the host application. `AsyncAPIRenderer` now forwards both props too, which previously left the raw-string path stuck with the default fallback.

  The "Example Request" panel now defaults to the agent prompt target rather than cURL.

## 1.0.1

### Patch Changes

- 5454e21: fix for post v1 patches

## 1.0.0

### Major Changes

- 8da2291: apiuikit support for asyncapi/openapi document

## 0.5.0

### Minor Changes

- aaa04ed: add support for extension catalog

## 0.4.1

### Patch Changes

- 4be20f1: docs update

## 0.4.0

### Minor Changes

- e02cf61: Improve search panel UI with clearer Cmd/Ctrl+K shortcut hints for Mac and non-Mac users

## 0.3.0

### Minor Changes

- 58c3b5f: Added a search component and make the components like Operations, Servers, Messages an independent exported component

## 0.2.1

### Patch Changes

- 51fd232: better colour consistency and better dark mode

## 0.2.0

### Minor Changes

- eb12f5c: refactor local dereferencing($ref)

## 0.1.1

### Patch Changes

- fa0cfce: project readme update

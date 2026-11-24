---
"apiuikit": patch
---

Fix type resolution under `moduleResolution: node16`/`nodenext`: relative imports in the published `.d.ts` files now use explicit `.js` paths, so `apiuikit`, `apiuikit/markdown`, and `apiuikit/plugin` no longer resolve to `any`.

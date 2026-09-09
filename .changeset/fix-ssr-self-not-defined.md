---
"apiuikit": patch
---

Fix `ReferenceError: self is not defined` when server-rendering apiuikit's components under Next.js (or any Node-based SSR). `isomorphic-dompurify` was being bundled into apiuikit's dist output, which locked in its browser-only implementation (an unguarded `self.DOMPurify` reference) at build time regardless of the environment actually loading it. It's now left external so each consumer's own bundler resolves the correct Node vs. browser implementation.

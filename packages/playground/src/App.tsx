import { createTryItButtonPlugin } from '@apiuikit/openapi-try-it-plugin'
import { Playground } from './Playground'

// Built once at module scope, not inline: a fresh array (or a fresh plugin)
// on every render would re-register the plugins and reset the operation's
// selected tab. The button variant fills
// `openapi.operation.reference.supplementary` — a "Try it" row on the Path
// side panel that opens the request builder in a modal.
const PLUGINS = [createTryItButtonPlugin()]

// Standalone-app shell: the reusable <Playground /> fills whatever container it's
// given; here that container is the full viewport.
export default function App() {
  return <Playground height="100vh" plugins={PLUGINS} />
}

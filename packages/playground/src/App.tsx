import { Playground } from './Playground'

// Standalone-app shell: the reusable <Playground /> fills whatever container it's
// given; here that container is the full viewport.
export default function App() {
  return <Playground height="100vh" />
}

// object-inspect only reads `inspect.custom` from this module in browser
// builds. Keeping the tiny compatibility surface here avoids bundling Node's
// `util` module or emitting Vite's browser-external placeholder.
const inspect = (value: unknown): string => String(value)

Object.assign(inspect, { custom: Symbol.for('nodejs.util.inspect.custom') })

export default inspect

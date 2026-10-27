import krakenWebsocketExample from '../examples/kraken-websocket.json'
import avroStreetlightExample from '../examples/avro-streetlight.json'
import protobufStreetlightExample from '../examples/protobuf-streetlight.json'
import tortureExample from '../examples/torture.json'
import openapiNetlifyExample from '../examples/openapi-netlify.json'
import openapiPetstoreExample from '../examples/openapi-petstore.json'
import openapiTortureExample from '../examples/openapi-torture.yaml?raw'
// The official Arazzo examples (OAI/Arazzo-Specification, Apache-2.0), shared
// with the library's tests and stories rather than copied.
import petCouponsArazzo from '../../../lib/src/helpers/tests/fixtures/arazzo/pet-coupons.arazzo.yaml?raw'
import petCouponsOpenAPI from '../../../lib/src/helpers/tests/fixtures/arazzo/pet-coupons.openapi.yaml?raw'
import bnplArazzo from '../../../lib/src/helpers/tests/fixtures/arazzo/bnpl-arazzo.yaml?raw'
import bnplOpenAPI from '../../../lib/src/helpers/tests/fixtures/arazzo/bnpl-openapi.yaml?raw'
import { singleFileWorkspace, fileNameFromUrl, isWorkspace } from '../utils/workspace'
import type { Workspace } from '../utils/workspace'
import type { FetchText } from '../utils/fetchDocument'

/** One file of a multi-file example: inline `content`, or a `url` to fetch. */
export interface ExampleFile {
  name: string
  content?: string
  url?: string
}

export type SpecKind = 'openapi' | 'asyncapi' | 'arazzo'

export interface SuggestedSchema {
  label: string
  /** Which specification the example's entry document is, shown as a pill. */
  spec: SpecKind
  /**
   * Where the document comes from, and the example's identity in the menu.
   * Bundled examples use a `local://` pseudo-URL that is never fetched. For a
   * multi-file example it only identifies the example.
   */
  url: string
  /** Inline document text for bundled examples — loaded directly, no fetch. */
  content?: string
  /**
   * A multi-file example: every file it loads, and which one is the entry
   * (rendered). Takes precedence over `content` / `url`.
   */
  files?: ExampleFile[]
  entry?: string
  /**
   * Site path serving this example rendered as Markdown, generated at build
   * time by scripts/generateDocsAssets.mjs. Handed to the renderer's
   * `config.markdown.url` so "View as Markdown" opens a real, shareable,
   * crawlable URL instead of a throwaway `blob:` one.
   *
   * Only bundled JSON examples have one. Remote URLs aren't known at build
   * time, and the YAML example is skipped, so both keep the blob fallback.
   */
  markdownPath?: string
}

// Real-world workflows from Jentic's public API catalog (CC0-1.0), pinned to
// a commit. Fetched when picked: their OpenAPI sources run to megabytes. Each
// source's `url` is relative to the catalog's root, so the source file is
// named after that path and the entry sits at the root.
const JENTIC = 'https://raw.githubusercontent.com/jentic/jentic-public-apis/bd204a22c4457fa4643e600b8b50c85c0de60a36'

function jenticExample(label: string, api: string, sourcePath: string): SuggestedSchema {
  const url = `${JENTIC}/workflows/${api}/workflows.arazzo.json`
  const entry = `${api}.arazzo.json`
  return { label, spec: 'arazzo', url, files: [{ name: entry, url }, { name: sourcePath, url: `${JENTIC}/${sourcePath}` }], entry }
}

// Redocly's Museum example (MIT), pinned to a commit: an Arazzo source
// calling another Arazzo document, operationPath steps, and regex and
// JSONPath criteria. The documents sit in `arazzo/`, the OpenAPI one level up.
const MUSEUM = 'https://raw.githubusercontent.com/Redocly/museum-openapi-example/2770b2b2e59832d245c7b0eb0badf6568d7efb53'

export const DEFAULT_SUGGESTED_SCHEMA = {
  label: 'Netlify API',
  spec: 'openapi',
  url: 'local://openapi-netlify.json',
  content: JSON.stringify(openapiNetlifyExample, null, 2),
  markdownPath: '/examples/openapi-netlify.md',
} satisfies SuggestedSchema

/**
 * Every example in the Examples menu, in the order it is shown. Reorder,
 * add or remove entries here directly.
 */
export const SUGGESTED_SCHEMAS: SuggestedSchema[] = [
  {
    label: 'Kraken WebSocket',
    spec: 'asyncapi',
    url: 'local://kraken-websocket.json',
    content: JSON.stringify(krakenWebsocketExample, null, 2),
    markdownPath: '/examples/kraken-websocket.md',
  },
  {
    label: 'Commune API',
    spec: 'openapi',
    url: 'https://api.usecommune.com/openapi.json',
  },
  {
    // The source's `url` is absolute, on raw.githubusercontent.com: the file
    // named after it stands in, so nothing is fetched.
    label: 'Buy now, pay later',
    spec: 'arazzo',
    url: 'local://arazzo-bnpl',
    files: [
      { name: 'bnpl-arazzo.yaml', content: bnplArazzo },
      { name: 'bnpl-openapi.yaml', content: bnplOpenAPI },
    ],
    entry: 'bnpl-arazzo.yaml',
  },
  {
    label: 'Streetlights Kafka',
    spec: 'asyncapi',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/streetlights-operation-security-asyncapi.yml',
  },
  {
    label: 'Porkbun API',
    spec: 'openapi',
    url: 'https://porkbun.com/api/json/v3/spec',
  },
  {
    label: 'Streetlights Mqtt',
    spec: 'asyncapi',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/streetlights-mqtt-asyncapi.yml',
  },
  {
    label: 'Petstore',
    spec: 'openapi',
    url: 'local://openapi-petstore.json',
    content: JSON.stringify(openapiPetstoreExample, null, 2),
    markdownPath: '/examples/openapi-petstore.md',
  },
  {
    label: 'Websocket Gemini',
    spec: 'asyncapi',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/websocket-gemini-asyncapi.yml',
  },
  {
    label: 'Streetlights Avro',
    spec: 'asyncapi',
    url: 'local://avro-streetlight.json',
    content: JSON.stringify(avroStreetlightExample, null, 2),
    markdownPath: '/examples/avro-streetlight.md',
  },
  {
    label: 'Streetlights Protobuf',
    spec: 'asyncapi',
    url: 'local://protobuf-streetlight.json',
    content: JSON.stringify(protobufStreetlightExample, null, 2),
    markdownPath: '/examples/protobuf-streetlight.md',
  },
  {
    label: 'Unrealistic Torture Test',
    spec: 'asyncapi',
    url: 'local://torture.json',
    content: JSON.stringify(tortureExample, null, 2),
    markdownPath: '/examples/torture.md',
  },
  DEFAULT_SUGGESTED_SCHEMA,
  {
    label: 'Unrealistic Torture Test',
    spec: 'openapi',
    url: 'local://openapi-torture.yaml',
    content: openapiTortureExample,
  },
  {
    // The source's `url` is `./pet-coupons.openapi.yaml`: matched by path.
    label: 'Pet coupons',
    spec: 'arazzo',
    url: 'local://arazzo-pet-coupons',
    files: [
      { name: 'pet-coupons.arazzo.yaml', content: petCouponsArazzo },
      { name: 'pet-coupons.openapi.yaml', content: petCouponsOpenAPI },
    ],
    entry: 'pet-coupons.arazzo.yaml',
  },
  {
    // Deliberately incomplete: the OpenAPI source isn't included, to show how
    // a missing source degrades and how the Sources panel fixes it.
    label: 'Pet coupons, source missing',
    spec: 'arazzo',
    url: 'local://arazzo-pet-coupons-missing',
    files: [{ name: 'pet-coupons.arazzo.yaml', content: petCouponsArazzo }],
    entry: 'pet-coupons.arazzo.yaml',
  },
  {
    label: 'Redocly Museum',
    spec: 'arazzo',
    url: `${MUSEUM}/arazzo/museum-api.arazzo.yaml`,
    files: [
      { name: 'arazzo/museum-api.arazzo.yaml', url: `${MUSEUM}/arazzo/museum-api.arazzo.yaml` },
      { name: 'arazzo/museum-tickets.arazzo.yaml', url: `${MUSEUM}/arazzo/museum-tickets.arazzo.yaml` },
      { name: 'openapi.yaml', url: `${MUSEUM}/openapi.yaml` },
    ],
    entry: 'arazzo/museum-api.arazzo.yaml',
  },
  jenticExample('Shutterstock, 23 workflows', 'shutterstock.com', 'apis/openapi/shutterstock.com/main/1.2.0/openapi.json'),
  jenticExample('Vercel, 18 workflows', 'vercel.com', 'apis/openapi/vercel.com/main/0.0.1/openapi.json'),
  jenticExample('Plaid, 17 workflows', 'plaid.com', 'apis/openapi/plaid.com/main/2020-09-14_1.631.0/openapi.json'),
  jenticExample('Slack, 17 workflows', 'slack.com', 'apis/openapi/slack.com/main/1.7.0/openapi.json'),
  jenticExample('YouTube, 9 workflows', 'googleapis.com~youtube', 'apis/openapi/googleapis.com/youtube/v3/openapi.json'),
  {
    label: 'Gitter Streaming',
    spec: 'asyncapi',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/gitter-streaming-asyncapi.yml',
  },
  {
    label: 'Operation Security',
    spec: 'asyncapi',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/operation-security-asyncapi.yml',
  },
]

/**
 * Builds the workspace an example loads into: its files (fetching any given by
 * URL) with its entry, or a one-file workspace named after its URL.
 */
export async function loadExampleWorkspace(example: SuggestedSchema, fetchText: FetchText): Promise<Workspace> {
  if (example.files) {
    const files = await Promise.all(
      example.files.map(async ({ name, content, url }) => ({
        name,
        content: content ?? (url ? await fetchText(url) : ''),
      })),
    )
    const workspace = { files, entry: example.entry ?? files[0]?.name }
    if (!isWorkspace(workspace)) throw new Error(`Example “${example.label}” is malformed`)
    return workspace
  }
  const content = example.content ?? (await fetchText(example.url))
  return singleFileWorkspace(content, fileNameFromUrl(example.url, content))
}

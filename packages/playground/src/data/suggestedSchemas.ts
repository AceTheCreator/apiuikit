import krakenWebsocketExample from '../examples/kraken-websocket.json'
import avroStreetlightExample from '../examples/avro-streetlight.json'
import protobufStreetlightExample from '../examples/protobuf-streetlight.json'
import tortureExample from '../examples/torture.json'
import openapiNetlifyExample from '../examples/openapi-netlify.json'
import openapiPetstoreExample from '../examples/openapi-petstore.json'
import openapiTortureExample from '../examples/openapi-torture.yaml?raw'

export interface SuggestedSchema {
  label: string
  url: string
  /** Inline document text for bundled examples — loaded directly, no fetch. */
  content?: string
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

export const DEFAULT_SUGGESTED_SCHEMA = {
  label: 'Netlify API (OpenAPI)',
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
    label: 'Kraken WebSocket (AsyncAPI)',
    url: 'local://kraken-websocket.json',
    content: JSON.stringify(krakenWebsocketExample, null, 2),
    markdownPath: '/examples/kraken-websocket.md',
  },
  {
    label: 'Commune API (OpenAPI)',
    url: 'https://api.usecommune.com/openapi.json',
  },
  {
    label: 'Streetlights Kafka (AsyncAPI)',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/streetlights-operation-security-asyncapi.yml',
  },
  {
    label: 'Porkbun API (OpenAPI)',
    url: 'https://porkbun.com/api/json/v3/spec',
  },
  {
    label: 'Streetlights Mqtt (AsyncAPI)',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/streetlights-mqtt-asyncapi.yml',
  },
  {
    label: 'Petstore (OpenAPI)',
    url: 'local://openapi-petstore.json',
    content: JSON.stringify(openapiPetstoreExample, null, 2),
    markdownPath: '/examples/openapi-petstore.md',
  },
  {
    label: 'Websocket Gemini (AsyncAPI)',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/websocket-gemini-asyncapi.yml',
  },
  {
    label: 'Streetlights Avro (AsyncAPI)',
    url: 'local://avro-streetlight.json',
    content: JSON.stringify(avroStreetlightExample, null, 2),
    markdownPath: '/examples/avro-streetlight.md',
  },
  {
    label: 'Streetlights Protobuf (AsyncAPI)',
    url: 'local://protobuf-streetlight.json',
    content: JSON.stringify(protobufStreetlightExample, null, 2),
    markdownPath: '/examples/protobuf-streetlight.md',
  },
  {
    label: 'Unrealistic Torture Test (AsyncAPI)',
    url: 'local://torture.json',
    content: JSON.stringify(tortureExample, null, 2),
    markdownPath: '/examples/torture.md',
  },
  DEFAULT_SUGGESTED_SCHEMA,
  {
    label: 'Unrealistic Torture Test (OpenAPI)',
    url: 'local://openapi-torture.yaml',
    content: openapiTortureExample,
  },
  {
    label: 'Gitter Streaming (AsyncAPI)',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/gitter-streaming-asyncapi.yml',
  },
  {
    label: 'Operation Security (AsyncAPI)',
    url: 'https://github.com/asyncapi/spec/blob/master/examples/operation-security-asyncapi.yml',
  },
]

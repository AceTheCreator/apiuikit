import avroStreetlightExample from '../examples/avro-streetlight.json'
import protobufStreetlightExample from '../examples/protobuf-streetlight.json'
import tortureExample from '../examples/torture.json'
import openapiNetlifyExample from '../examples/openapi-netlify.json'
import openapiPetstoreExample from '../examples/openapi-petstore.json'
import openapiTortureExample from '../examples/openapi-torture.yaml?raw'

const RAW_URLS = [
  'https://github.com/asyncapi/spec/blob/master/examples/streetlights-operation-security-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/adeo-kafka-request-reply-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/anyof-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/application-headers-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/correlation-id-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/gitter-streaming-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/kraken-websocket-request-reply-message-filter-in-reply-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/kraken-websocket-request-reply-multiple-channels-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/mercure-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/not-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/oneof-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/operation-security-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/rpc-client-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/rpc-server-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/simple-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/slack-rtm-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/streetlights-kafka-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/streetlights-mqtt-asyncapi.yml',
  'https://github.com/asyncapi/spec/blob/master/examples/websocket-gemini-asyncapi.yml',
]

const OPENAPI_RAW_URLS = [
  'https://github.com/OAI/OpenAPI-Specification/blob/main/_archive_/schemas/v3.0/pass/petstore.yaml',
  'https://github.com/OAI/OpenAPI-Specification/blob/main/_archive_/schemas/v3.0/pass/petstore-expanded.yaml',
]

function labelFromUrl(url: string): string {
  const filename = url.split('/').pop() ?? url
  const name = filename.replace(/-asyncapi\.ya?ml$/i, '').replace(/\.ya?ml$/i, '')
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

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

export const SUGGESTED_SCHEMAS: SuggestedSchema[] = [
  ...[...new Set(RAW_URLS)].map((url) => ({
    url,
    label: `${labelFromUrl(url)} (AsyncAPI)`,
  })),
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
    label: 'Petstore (OpenAPI)',
    url: 'local://openapi-petstore.json',
    content: JSON.stringify(openapiPetstoreExample, null, 2),
    markdownPath: '/examples/openapi-petstore.md',
  },
  {
    label: 'Unrealistic Torture Test (OpenAPI)',
    url: 'local://openapi-torture.yaml',
    content: openapiTortureExample,
  },
  ...[...new Set(OPENAPI_RAW_URLS)].map((url) => ({
    url,
    label: `${labelFromUrl(url)} (OpenAPI)`,
  })),
]

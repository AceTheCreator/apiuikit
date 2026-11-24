// If any of these entry points stops resolving under nodenext, its exports
// become `any`: the @ts-expect-error lines then go unused (TS2578) and the
// `kind` parameter below loses its type (TS7031).
import { AsyncAPI, OpenAPI, type ConfigInterface } from 'apiuikit'
import { documentToMarkdown } from 'apiuikit/markdown'
import { definePlugin, type ApiuikitPlugin } from 'apiuikit/plugin'

// @ts-expect-error AsyncAPI is a component, not a string
export const asyncApi: string = AsyncAPI
// @ts-expect-error OpenAPI is a component, not a string
export const openApi: string = OpenAPI
// @ts-expect-error documentToMarkdown is a function, not a string
export const toMarkdown: string = documentToMarkdown
// @ts-expect-error definePlugin is a function, not a string
export const plugin: string = definePlugin

export const config: ConfigInterface = {
  markdown: {
    url: ({ kind }) => (kind === 'operation' ? null : '/api.md'),
  },
}

export const definePluginReturn: (plugin: ApiuikitPlugin) => ApiuikitPlugin = definePlugin

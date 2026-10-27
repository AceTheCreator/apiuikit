import { describe, expect, it } from 'vitest'
import { isKnownSnapshot, isSnapshot, migrateSnapshot } from '../snapshot'

const openapiJson = JSON.stringify({ openapi: '3.1.0', info: { title: 'T', version: '1' } }, null, 2)
const asyncapiYaml = 'asyncapi: 3.0.0\ninfo:\n  title: T\n  version: 1.0.0\n'

describe('migrateSnapshot', () => {
  it('turns a v1 document into a one-file workspace named after its spec type', () => {
    expect(migrateSnapshot({ v: 1, doc: openapiJson, config: '{}' })).toEqual({
      v: 2,
      files: [{ name: 'openapi.json', content: openapiJson }],
      entry: 'openapi.json',
      config: '{}',
    })
    expect(migrateSnapshot({ v: 1, doc: asyncapiYaml, config: '' })).toMatchObject({
      files: [{ name: 'asyncapi.yaml', content: asyncapiYaml }],
      entry: 'asyncapi.yaml',
    })
  })

  it('keeps an empty or unrecognised v1 document', () => {
    expect(migrateSnapshot({ v: 1, doc: '', config: '{' })).toMatchObject({
      files: [{ name: 'document.yaml', content: '' }],
      config: '{',
    })
  })

  it('passes a valid v2 snapshot through unchanged', () => {
    const snapshot = {
      v: 2,
      files: [
        { name: 'main.yaml', content: asyncapiYaml },
        { name: 'specs/petstore.json', content: openapiJson },
      ],
      entry: 'main.yaml',
      active: 'specs/petstore.json',
      config: '{}',
    }
    expect(migrateSnapshot(snapshot)).toBe(snapshot)
  })

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['an unknown version', { v: 3, files: [], entry: 'a', config: '' }],
    ['v1 without doc', { v: 1, config: '' }],
    ['v1 with a non-string config', { v: 1, doc: '', config: {} }],
    ['v2 without files', { v: 2, files: [], entry: 'a.yaml', config: '' }],
    ['v2 with an entry that is not a file', { v: 2, files: [{ name: 'a.yaml', content: '' }], entry: 'b.yaml', config: '' }],
    ['v2 with an active file that is not a file', { v: 2, files: [{ name: 'a.yaml', content: '' }], entry: 'a.yaml', active: 'b.yaml', config: '' }],
    [
      'v2 with duplicate names',
      { v: 2, files: [{ name: 'a.yaml', content: '' }, { name: 'a.yaml', content: 'x' }], entry: 'a.yaml', config: '' },
    ],
    ['v2 with an invalid name', { v: 2, files: [{ name: '../a.yaml', content: '' }], entry: '../a.yaml', config: '' }],
    ['v2 with non-string content', { v: 2, files: [{ name: 'a.yaml', content: 1 }], entry: 'a.yaml', config: '' }],
    ['v2 without config', { v: 2, files: [{ name: 'a.yaml', content: '' }], entry: 'a.yaml' }],
  ])('rejects %s', (_, value) => {
    expect(migrateSnapshot(value)).toBeNull()
  })
})

describe('isSnapshot / isKnownSnapshot', () => {
  it('only treats v2 as current, but knows v1', () => {
    const v1 = { v: 1, doc: '', config: '' }
    expect(isSnapshot(v1)).toBe(false)
    expect(isKnownSnapshot(v1)).toBe(true)
    expect(isKnownSnapshot({ v: 2, files: [{ name: 'a.yaml', content: '' }], entry: 'a.yaml', config: '' })).toBe(true)
    expect(isKnownSnapshot({ v: 2 })).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import {
  fileForUrl,
  filesReferencing,
  followableSources,
  isAbsoluteUrl,
  matchSources,
  matchedFile,
  readSourceDescriptions,
  savedFileName,
} from '../arazzoSources'
import type { Workspace } from '../workspace'

const arazzo = (sources: string) => `arazzo: 1.0.1
info: { title: Flows, version: 1.0.0 }
sourceDescriptions:
${sources}
workflows: []
`

describe('readSourceDescriptions', () => {
  it('reads names, urls and types from YAML or JSON', () => {
    expect(readSourceDescriptions(arazzo('  - { name: pets, url: ./pets.yaml, type: openapi }\n  - name: flows'))).toEqual([
      { name: 'pets', url: './pets.yaml', type: 'openapi' },
      { name: 'flows' },
    ])
    expect(readSourceDescriptions('{"arazzo":"1.0.1","sourceDescriptions":[{"name":"a","url":"a.json"}]}')).toEqual([{ name: 'a', url: 'a.json' }])
  })

  it('skips entries without a name, and returns null for text that doesn’t parse', () => {
    expect(readSourceDescriptions(arazzo('  - url: ./x.yaml\n  - 3\n  - name: ok'))).toEqual([{ name: 'ok' }])
    expect(readSourceDescriptions('arazzo: 1.0.1')).toEqual([])
    expect(readSourceDescriptions('arazzo: [unclosed')).toBeNull()
    expect(readSourceDescriptions('just text')).toBeNull()
  })
})

describe('naming a url', () => {
  it('tells absolute urls from relative ones', () => {
    expect(isAbsoluteUrl('https://example.com/a.yaml')).toBe(true)
    expect(isAbsoluteUrl('//cdn.example.com/a.yaml')).toBe(true)
    expect(isAbsoluteUrl('./a.yaml')).toBe(false)
    expect(isAbsoluteUrl('specs/a.yaml')).toBe(false)
  })

  it('saves an absolute url under its last path segment, when that’s a usable name', () => {
    expect(savedFileName('https://raw.githubusercontent.com/OAI/Arazzo-Specification/main/examples/1.0.0/bnpl-openapi.yaml')).toBe('bnpl-openapi.yaml')
    expect(savedFileName('https://example.com/api/spec?format=yaml#top')).toBe('spec')
    expect(savedFileName('https://example.com/')).toBeNull()
    expect(savedFileName('https://example.com/my%20api.yaml')).toBeNull()
  })

  it('finds the file a nested url reads, relative to the entry', () => {
    expect(fileForUrl('./pets.yaml', 'flows/main.yaml')).toBe('flows/pets.yaml')
    expect(fileForUrl('../pets.yaml', 'flows/main.yaml')).toBe('pets.yaml')
    expect(fileForUrl('https://example.com/pets.yaml', 'flows/main.yaml')).toBe('pets.yaml')
  })
})

describe('matchSources', () => {
  const workspace: Workspace = {
    files: [
      { name: 'flows/main.arazzo.yaml', content: '' },
      { name: 'flows/pets.yaml', content: '' },
      { name: 'shared.yaml', content: '' },
      { name: 'bnpl-openapi.yaml', content: '' },
    ],
    entry: 'flows/main.arazzo.yaml',
  }
  const match = (sources: Parameters<typeof matchSources>[1]) => matchSources(workspace, sources, workspace.entry)

  it('matches relative urls by path from the entry’s folder', () => {
    const [pets, petsBare, shared, missing, outside] = match([
      { name: 'pets', url: './pets.yaml' },
      { name: 'petsBare', url: 'pets.yaml' },
      { name: 'shared', url: '../shared.yaml' },
      { name: 'missing', url: './payments.yaml' },
      { name: 'outside', url: '../../elsewhere.yaml' },
    ])
    expect(pets).toMatchObject({ kind: 'relative', fileName: 'flows/pets.yaml', found: true, index: 0 })
    expect(petsBare).toMatchObject({ fileName: 'flows/pets.yaml', found: true })
    expect(shared).toMatchObject({ fileName: 'shared.yaml', found: true })
    expect(missing).toMatchObject({ kind: 'relative', fileName: 'flows/payments.yaml', found: false })
    expect(outside).toMatchObject({ kind: 'relative', fileName: null })
    expect([pets, missing, outside].map(matchedFile)).toEqual(['flows/pets.yaml', null, null])
  })

  it('doesn’t guess between similar names', () => {
    // Only `flows/pets.yaml` exists; `Pets.yaml` and `pets.yml` are other files.
    expect(match([{ name: 'a', url: './Pets.yaml' }, { name: 'b', url: './pets.yml' }]).map(matchedFile)).toEqual([null, null])
  })

  it('matches an absolute url to the file it would be saved as, unless two urls share that name', () => {
    expect(match([{ name: 'bnpl', url: 'https://raw.githubusercontent.com/OAI/x/main/bnpl-openapi.yaml' }])[0]).toMatchObject({
      kind: 'absolute',
      fileName: 'bnpl-openapi.yaml',
      found: true,
    })
    expect(match([{ name: 'remote', url: 'https://example.com/other.yaml' }])[0]).toMatchObject({ fileName: 'other.yaml', found: false })
    const shared = match([
      { name: 'a', url: 'https://a.example.com/bnpl-openapi.yaml' },
      { name: 'b', url: 'https://b.example.com/bnpl-openapi.yaml' },
    ])
    expect(shared.map((m) => [m.kind, matchedFile(m), 'fileName' in m && m.fileName])).toEqual([
      ['absolute', null, null],
      ['absolute', null, null],
    ])
  })

  it('flags a source without a url', () => {
    expect(match([{ name: 'bare' }])[0]).toEqual({ name: 'bare', index: 0, kind: 'no-url' })
  })
})

describe('filesReferencing', () => {
  const workspace: Workspace = {
    files: [
      { name: 'flows/main.arazzo.yaml', content: arazzo('  - { name: pets, url: ./pets.yaml }') },
      { name: 'other.arazzo.yaml', content: arazzo('  - { name: pets, url: ./flows/pets.yaml }\n  - { name: x, url: ./x.yaml }') },
      { name: 'flows/pets.yaml', content: 'openapi: 3.1.0' },
      { name: 'x.yaml', content: 'openapi: 3.1.0' },
    ],
    entry: 'flows/main.arazzo.yaml',
  }

  it('lists the Arazzo files with a source reading the file, from their own folders', () => {
    expect(filesReferencing(workspace, 'flows/pets.yaml')).toEqual(['flows/main.arazzo.yaml', 'other.arazzo.yaml'])
    expect(filesReferencing(workspace, 'x.yaml')).toEqual(['other.arazzo.yaml'])
    expect(filesReferencing(workspace, 'flows/main.arazzo.yaml')).toEqual([])
  })
})

describe('followableSources', () => {
  it('lists relative sources, resolved against the document’s url, under the files that will match them', () => {
    const content = arazzo(
      [
        '  - { name: pets, url: ./pets.yaml }',
        '  - { name: deep, url: specs/orders.json }',
        '  - { name: again, url: pets.yaml }',
        '  - { name: remote, url: "https://example.com/x.yaml" }',
        '  - { name: up, url: ../up.yaml }',
        '  - { name: spaced, url: "./my api.yaml" }',
      ].join('\n'),
    )
    expect(followableSources(content, 'https://github.com/o/r/blob/main/flows/main.arazzo.yaml', 'main.arazzo.yaml')).toEqual({
      sources: [
        { name: 'pets', url: 'https://github.com/o/r/blob/main/flows/pets.yaml', fileName: 'pets.yaml' },
        { name: 'deep', url: 'https://github.com/o/r/blob/main/flows/specs/orders.json', fileName: 'specs/orders.json' },
      ],
      skipped: ['up', 'spaced'],
    })
  })
})

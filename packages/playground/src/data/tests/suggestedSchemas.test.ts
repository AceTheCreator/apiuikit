import { describe, expect, it, vi } from 'vitest'
import { SUGGESTED_SCHEMAS, loadExampleWorkspace } from '../suggestedSchemas'

describe('loadExampleWorkspace', () => {
  it('loads a bundled single-file example as a one-file workspace named after it', async () => {
    const fetchText = vi.fn()
    const petstore = SUGGESTED_SCHEMAS.find((s) => s.url === 'local://openapi-petstore.json')!
    expect(await loadExampleWorkspace(petstore, fetchText)).toEqual({
      files: [{ name: 'openapi-petstore.json', content: petstore.content }],
      entry: 'openapi-petstore.json',
    })
    expect(fetchText).not.toHaveBeenCalled()
  })

  it('fetches a remote single-file example', async () => {
    const fetchText = vi.fn().mockResolvedValue('asyncapi: 3.0.0')
    const ws = await loadExampleWorkspace(
      { label: 'Remote', spec: 'asyncapi', url: 'https://github.com/o/r/blob/main/examples/gitter.yml' },
      fetchText,
    )
    expect(fetchText).toHaveBeenCalledWith('https://github.com/o/r/blob/main/examples/gitter.yml')
    expect(ws).toEqual({ files: [{ name: 'gitter.yml', content: 'asyncapi: 3.0.0' }], entry: 'gitter.yml' })
  })

  it('loads every file of a multi-file example, inline or fetched, with its entry', async () => {
    const fetchText = vi.fn().mockResolvedValue('{"openapi":"3.1.0"}')
    const ws = await loadExampleWorkspace(
      {
        label: 'Multi',
        spec: 'asyncapi',
        url: 'local://multi',
        files: [
          { name: 'specs/petstore.json', url: 'https://example.com/petstore.json' },
          { name: 'main.yaml', content: 'asyncapi: 3.0.0' },
        ],
        entry: 'main.yaml',
      },
      fetchText,
    )
    expect(ws).toEqual({
      files: [
        { name: 'specs/petstore.json', content: '{"openapi":"3.1.0"}' },
        { name: 'main.yaml', content: 'asyncapi: 3.0.0' },
      ],
      entry: 'main.yaml',
    })
  })

  it('rejects a malformed multi-file example', async () => {
    await expect(
      loadExampleWorkspace({ label: 'Bad', spec: 'asyncapi', url: 'local://bad', files: [{ name: 'a.yaml', content: '' }], entry: 'b.yaml' }, vi.fn()),
    ).rejects.toThrow('malformed')
  })

  it('every fetched multi-file example names valid files and an entry among them', async () => {
    const fetchText = vi.fn().mockResolvedValue('{}')
    const remote = SUGGESTED_SCHEMAS.filter((s) => s.files?.some((file) => file.url))
    expect(remote.length).toBeGreaterThan(0)
    for (const example of remote) {
      const ws = await loadExampleWorkspace(example, fetchText)
      expect(ws.files.map((file) => file.name)).toContain(example.entry)
    }
  })

  it('every bundled example loads', async () => {
    const bundled = (s: (typeof SUGGESTED_SCHEMAS)[number]) =>
      s.files ? s.files.every((file) => file.content !== undefined) : s.content !== undefined
    for (const example of SUGGESTED_SCHEMAS.filter(bundled)) {
      await expect(loadExampleWorkspace(example, vi.fn())).resolves.toBeTruthy()
    }
  })
})

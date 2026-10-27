import { describe, expect, it } from 'vitest'
import {
  addFile,
  defaultFileName,
  deleteFile,
  detectSpecType,
  fileLanguage,
  fileNameError,
  fileNameFromUrl,
  getEntryFile,
  readWorkspaceFile,
  renameFile,
  resolveWorkspacePath,
  restoreFile,
  setEntryFile,
  singleFileWorkspace,
  uniqueFileName,
  updateFileContent,
} from '../workspace'
import type { Workspace, WorkspaceResult } from '../workspace'

function ok(result: WorkspaceResult): Workspace {
  if ('error' in result) throw new Error(result.error)
  return result.workspace
}

const two: Workspace = {
  files: [
    { name: 'main.yaml', content: 'asyncapi: 3.0.0' },
    { name: 'specs/petstore.json', content: '{"openapi":"3.1.0"}' },
  ],
  entry: 'main.yaml',
}

describe('fileNameError', () => {
  it.each(['a.yaml', 'specs/petstore.yaml', 'a-b_c~d.v2.json', 'README'])('accepts %s', (name) => {
    expect(fileNameError(name)).toBeNull()
  })

  it.each(['', '  ', '/a.yaml', 'a/', 'a//b', './a', 'a/../b', 'with space.yaml', 'q?.json', 'x'.repeat(201)])(
    'rejects %j',
    (name) => {
      expect(fileNameError(name)).toEqual(expect.any(String))
    },
  )
})

describe('file operations', () => {
  it('adds a file, refusing duplicates and invalid names', () => {
    const ws = ok(addFile(two, { name: 'other.yaml', content: '' }))
    expect(ws.files.map((f) => f.name)).toEqual(['main.yaml', 'specs/petstore.json', 'other.yaml'])
    expect(addFile(two, { name: 'main.yaml', content: '' })).toEqual({ error: expect.stringContaining('already exists') })
    expect(addFile(two, { name: 'bad name', content: '' })).toHaveProperty('error')
  })

  it('renames a file in place, carrying the entry along', () => {
    const ws = ok(renameFile(two, 'main.yaml', 'workflows/main.yaml'))
    expect(ws.files.map((f) => f.name)).toEqual(['workflows/main.yaml', 'specs/petstore.json'])
    expect(ws.entry).toBe('workflows/main.yaml')
    expect(ok(renameFile(two, 'main.yaml', 'main.yaml'))).toBe(two)
    expect(renameFile(two, 'main.yaml', 'specs/petstore.json')).toHaveProperty('error')
    expect(renameFile(two, 'missing.yaml', 'x.yaml')).toHaveProperty('error')
  })

  it('deletes any file but the last one', () => {
    const ws = ok(deleteFile(two, 'specs/petstore.json'))
    expect(ws.files.map((f) => f.name)).toEqual(['main.yaml'])
    expect(ws.entry).toBe('main.yaml')
    expect(deleteFile(ws, 'main.yaml')).toEqual({ error: expect.stringContaining('only file') })
    expect(deleteFile(two, 'missing.yaml')).toHaveProperty('error')
  })

  it('hands the entry to an Arazzo file, else the first file, when the entry is deleted', () => {
    expect(ok(deleteFile(two, 'main.yaml')).entry).toBe('specs/petstore.json')
    const withArazzo: Workspace = {
      files: [...two.files, { name: 'flows.arazzo.yaml', content: 'arazzo: 1.0.1' }],
      entry: 'main.yaml',
    }
    expect(ok(deleteFile(withArazzo, 'main.yaml')).entry).toBe('flows.arazzo.yaml')
  })

  it('restores a deleted file at its position, entry included', () => {
    const ws = ok(deleteFile(two, 'main.yaml'))
    expect(ok(restoreFile(ws, two.files[0], 0, true))).toEqual(two)
    const kept = ok(restoreFile(ok(deleteFile(two, 'specs/petstore.json')), two.files[1], 1, false))
    expect(kept).toEqual(two)
    expect(restoreFile(two, two.files[0], 0, false)).toHaveProperty('error')
  })

  it('switches the entry file, and the entry is what gets rendered', () => {
    const ws = ok(setEntryFile(two, 'specs/petstore.json'))
    expect(getEntryFile(ws).content).toBe('{"openapi":"3.1.0"}')
    expect(setEntryFile(two, 'missing.yaml')).toHaveProperty('error')
  })

  it('edits one file only', () => {
    const ws = updateFileContent(two, 'specs/petstore.json', '{}')
    expect(ws.files[0]).toBe(two.files[0])
    expect(ws.files[1].content).toBe('{}')
  })
})

describe('naming helpers', () => {
  it('makes a name unique before its extension', () => {
    expect(uniqueFileName(two, 'new.yaml')).toBe('new.yaml')
    expect(uniqueFileName(two, 'main.yaml')).toBe('main-2.yaml')
    const ws = ok(addFile(two, { name: 'main-2.yaml', content: '' }))
    expect(uniqueFileName(ws, 'main.yaml')).toBe('main-3.yaml')
    expect(uniqueFileName(ok(addFile(two, { name: 'Makefile', content: '' })), 'Makefile')).toBe('Makefile-2')
  })

  it('names fetched documents after their URL', () => {
    expect(fileNameFromUrl('https://example.com/specs/petstore.yaml?x=1', '')).toBe('petstore.yaml')
    expect(fileNameFromUrl('local://openapi-netlify.json', '{}')).toBe('openapi-netlify.json')
    expect(fileNameFromUrl('https://porkbun.com/api/json/v3/spec', '{"openapi":"3.0.0"}')).toBe('spec.json')
    expect(fileNameFromUrl('https://example.com/', '{"openapi":"3.0.0"}')).toBe('openapi.json')
    expect(fileNameFromUrl('https://example.com/my%20spec.yaml', '')).toBe('my-spec.yaml')
  })

  it('derives a default name and language from the content', () => {
    expect(defaultFileName('{"asyncapi":"3.0.0"}')).toBe('asyncapi.json')
    expect(defaultFileName('openapi: 3.1.0')).toBe('openapi.yaml')
    expect(defaultFileName('swagger: "2.0"')).toBe('openapi.yaml')
    expect(defaultFileName('arazzo: 1.0.1')).toBe('arazzo.yaml')
    expect(singleFileWorkspace('openapi: 3.1.0')).toEqual({
      files: [{ name: 'openapi.yaml', content: 'openapi: 3.1.0' }],
      entry: 'openapi.yaml',
    })
    expect(fileLanguage('a.yml', '{}')).toBe('yaml')
    expect(fileLanguage('a.json', 'x: 1')).toBe('json')
    expect(fileLanguage('noext', '  {')).toBe('json')
  })

  it('detects the spec type of minified JSON and YAML', () => {
    expect(detectSpecType('{"info":{},"openapi":"3.1.0"}')).toBe('openapi')
    expect(detectSpecType('info: {}\nasyncapi: 3.0.0')).toBe('asyncapi')
    expect(detectSpecType('arazzo: 1.0.1')).toBe('arazzo')
    expect(detectSpecType('{"info":{},"arazzo":"1.0.1"}')).toBe('arazzo')
    expect(detectSpecType('swagger: "2.0"')).toBe('openapi')
    expect(detectSpecType('info: {}')).toBeNull()
  })
})

describe('resolveWorkspacePath / readWorkspaceFile', () => {
  it('resolves references relative to the referring file', () => {
    expect(resolveWorkspacePath('./petstore.json', 'specs/main.yaml')).toBe('specs/petstore.json')
    expect(resolveWorkspacePath('../main.yaml', 'specs/a.yaml')).toBe('main.yaml')
    expect(resolveWorkspacePath('/specs/petstore.json', 'deep/er/a.yaml')).toBe('specs/petstore.json')
    expect(resolveWorkspacePath('specs/petstore.json#/paths')).toBe('specs/petstore.json')
  })

  it('returns null for absolute URLs and paths outside the workspace', () => {
    expect(resolveWorkspacePath('https://example.com/a.yaml')).toBeNull()
    expect(resolveWorkspacePath('//example.com/a.yaml')).toBeNull()
    expect(resolveWorkspacePath('../a.yaml', 'main.yaml')).toBeNull()
    expect(resolveWorkspacePath('')).toBeNull()
  })

  it('reads a referenced file', () => {
    expect(readWorkspaceFile(two, './specs/petstore.json', 'main.yaml')).toBe('{"openapi":"3.1.0"}')
    expect(readWorkspaceFile(two, 'missing.yaml', 'main.yaml')).toBeUndefined()
  })
})

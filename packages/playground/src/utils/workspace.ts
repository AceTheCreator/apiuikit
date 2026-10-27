/**
 * The playground's editable state: a set of named files, one of which (the
 * entry) is rendered. File names are the only way files are addressed, so they
 * are kept unique and path-like (`specs/petstore.yaml`) — later, `url`s inside
 * a spec (Arazzo sourceDescriptions, external `$ref`s) can be matched against
 * them with `resolveWorkspacePath`.
 *
 * Everything here is pure: each operation returns a new workspace, or an error
 * message the UI can show as-is.
 */

export interface WorkspaceFile {
  name: string
  content: string
}

export interface Workspace {
  files: WorkspaceFile[]
  /** Name of the file that gets rendered. Always one of `files`. */
  entry: string
}

export type WorkspaceResult = { workspace: Workspace } | { error: string }

export type FileLanguage = 'json' | 'yaml'

const MAX_NAME_LENGTH = 200
// Characters that are safe unescaped in a URL path, so a file name can later be
// matched against a `url` in a spec without any decoding.
const SEGMENT_PATTERN = /^[A-Za-z0-9._~-]+$/

/** Returns why `name` isn't usable as a file name, or null when it is. */
export function fileNameError(name: string): string | null {
  if (name.trim() === '') return 'File name is required'
  if (name.length > MAX_NAME_LENGTH) return `File name must be at most ${MAX_NAME_LENGTH} characters`
  if (name.startsWith('/') || name.endsWith('/')) return 'File name can’t start or end with “/”'
  for (const segment of name.split('/')) {
    if (segment === '') return 'File name can’t contain “//”'
    if (segment === '.' || segment === '..') return 'File name can’t contain “.” or “..” folders'
    if (!SEGMENT_PATTERN.test(segment)) return 'Use letters, digits, “.”, “-”, “_”, “~” and “/” only'
  }
  return null
}

export function hasFile(workspace: Workspace, name: string): boolean {
  return workspace.files.some((f) => f.name === name)
}

export function getFile(workspace: Workspace, name: string): WorkspaceFile | undefined {
  return workspace.files.find((f) => f.name === name)
}

export function getEntryFile(workspace: Workspace): WorkspaceFile {
  // `entry` always names a file (every operation below keeps it that way); the
  // fallback only guards against a hand-built workspace.
  return getFile(workspace, workspace.entry) ?? workspace.files[0]
}

/**
 * Validates a workspace from an untrusted source (localStorage, a share link,
 * embedding props): at least one file, valid and unique names, and an entry
 * that names one of them.
 */
export function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false
  const { files, entry } = value as Record<string, unknown>
  if (!Array.isArray(files) || files.length === 0 || typeof entry !== 'string') return false
  const names = new Set<string>()
  for (const file of files) {
    if (!file || typeof file !== 'object') return false
    const { name, content } = file as Record<string, unknown>
    if (typeof name !== 'string' || typeof content !== 'string') return false
    if (fileNameError(name) !== null || names.has(name)) return false
    names.add(name)
  }
  return names.has(entry)
}

/** A single-file workspace — what every pre-workspace session becomes. */
export function singleFileWorkspace(content: string, name = defaultFileName(content)): Workspace {
  return { files: [{ name, content }], entry: name }
}

/** Picks the editor language from the extension, falling back to the content. */
export function fileLanguage(name: string, content: string): FileLanguage {
  const lower = name.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml'
  return content.trimStart().startsWith('{') ? 'json' : 'yaml'
}

/** Which renderer the document wants, sniffed from its own top-level key. */
export function detectSpecType(content: string): 'asyncapi' | 'openapi' | 'arazzo' | null {
  // JSON docs are parsed directly rather than line-sniffed: minified/pasted
  // JSON puts the top-level key right after `{` on the same line, which a
  // line-anchored regex would never match.
  if (content.trimStart().startsWith('{')) {
    try {
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object') {
        if ('asyncapi' in parsed) return 'asyncapi'
        if ('openapi' in parsed || 'swagger' in parsed) return 'openapi'
        if ('arazzo' in parsed) return 'arazzo'
      }
    } catch {
      // Invalid/mid-edit JSON — fall through to the line sniff below.
    }
  }
  // YAML has no such ambiguity: a top-level key always starts its own line.
  const match = content.match(/^\s*["']?(asyncapi|openapi|swagger|arazzo)["']?\s*:/m)
  if (!match) return null
  if (match[1] === 'swagger') return 'openapi'
  return match[1] as 'asyncapi' | 'openapi' | 'arazzo'
}

/** `openapi.json`, `asyncapi.yaml`, … — a name for a document that came without one. */
export function defaultFileName(content: string): string {
  const base = detectSpecType(content) ?? 'document'
  return `${base}.${fileLanguage('', content)}`
}

/**
 * A file name for a document fetched from `url`: the last path segment when
 * it's usable, otherwise a name from the content. An extension is added when
 * the segment has none, so the editor picks the right language.
 */
export function fileNameFromUrl(url: string, content: string): string {
  let segment = ''
  try {
    const parsed = new URL(url)
    // `local://name.json` (bundled examples) parses with the name as the host.
    const path = parsed.protocol === 'local:' ? `${parsed.hostname}${parsed.pathname}` : parsed.pathname
    segment = decodeURIComponent(path.split('/').filter(Boolean).pop() ?? '')
  } catch {
    segment = url.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? ''
  }
  segment = segment.replace(/[^A-Za-z0-9._~-]/g, '-')
  if (!segment || fileNameError(segment) !== null) return defaultFileName(content)
  if (!/\.[A-Za-z0-9]+$/.test(segment)) return `${segment}.${fileLanguage('', content)}`
  return segment
}

/** `name` if it's free, else `name-2.ext`, `name-3.ext`, … */
export function uniqueFileName(workspace: Workspace, name: string): string {
  if (!hasFile(workspace, name)) return name
  const slash = name.lastIndexOf('/')
  const dot = name.lastIndexOf('.')
  const splitAt = dot > slash + 1 ? dot : name.length
  const stem = name.slice(0, splitAt)
  const ext = name.slice(splitAt)
  for (let n = 2; ; n++) {
    const candidate = `${stem}-${n}${ext}`
    if (!hasFile(workspace, candidate)) return candidate
  }
}

export function addFile(workspace: Workspace, file: WorkspaceFile): WorkspaceResult {
  const error = fileNameError(file.name)
  if (error) return { error }
  if (hasFile(workspace, file.name)) return { error: `A file named “${file.name}” already exists` }
  return { workspace: { ...workspace, files: [...workspace.files, file] } }
}

export function updateFileContent(workspace: Workspace, name: string, content: string): Workspace {
  return {
    ...workspace,
    files: workspace.files.map((f) => (f.name === name ? { ...f, content } : f)),
  }
}

export function renameFile(workspace: Workspace, from: string, to: string): WorkspaceResult {
  if (!hasFile(workspace, from)) return { error: `No file named “${from}”` }
  if (from === to) return { workspace }
  const error = fileNameError(to)
  if (error) return { error }
  if (hasFile(workspace, to)) return { error: `A file named “${to}” already exists` }
  return {
    workspace: {
      files: workspace.files.map((f) => (f.name === from ? { ...f, name: to } : f)),
      entry: workspace.entry === from ? to : workspace.entry,
    },
  }
}

/**
 * The last file can't be deleted, so a workspace is never empty. Deleting the
 * entry makes another file the entry: the first Arazzo document if there is
 * one (it's what ties the others together), else the first file.
 */
export function deleteFile(workspace: Workspace, name: string): WorkspaceResult {
  if (!hasFile(workspace, name)) return { error: `No file named “${name}”` }
  if (workspace.files.length === 1) return { error: 'The only file can’t be deleted' }
  const files = workspace.files.filter((f) => f.name !== name)
  if (workspace.entry !== name) return { workspace: { ...workspace, files } }
  const entry = files.find((f) => detectSpecType(f.content) === 'arazzo') ?? files[0]
  return { workspace: { files, entry: entry.name } }
}

/**
 * Puts a deleted file back where it was, for undo. `wasEntry` makes it the
 * entry again. Fails if a file has taken its name in the meantime.
 */
export function restoreFile(workspace: Workspace, file: WorkspaceFile, index: number, wasEntry: boolean): WorkspaceResult {
  if (hasFile(workspace, file.name)) return { error: `A file named “${file.name}” already exists` }
  const files = [...workspace.files]
  files.splice(Math.min(index, files.length), 0, file)
  return { workspace: { files, entry: wasEntry ? file.name : workspace.entry } }
}

export function setEntryFile(workspace: Workspace, name: string): WorkspaceResult {
  if (!hasFile(workspace, name)) return { error: `No file named “${name}”` }
  return { workspace: { ...workspace, entry: name } }
}

/**
 * Maps a reference found inside `fromFile` (e.g. a `url` in an Arazzo
 * sourceDescription) to a workspace file name, resolving `./` and `../`
 * against `fromFile`'s folder. Returns null for absolute URLs and paths that
 * climb out of the workspace. Doesn't check that the file exists — pair it
 * with `getFile`.
 */
export function resolveWorkspacePath(ref: string, fromFile?: string): string | null {
  const path = ref.split(/[?#]/)[0]
  if (path === '' || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(path) || path.startsWith('//')) return null
  const base = path.startsWith('/') || !fromFile ? [] : fromFile.split('/').slice(0, -1)
  const segments = [...base]
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) return null
      segments.pop()
    } else {
      segments.push(segment)
    }
  }
  return segments.length > 0 ? segments.join('/') : null
}

/** Reads a referenced file's content — see `resolveWorkspacePath`. */
export function readWorkspaceFile(workspace: Workspace, ref: string, fromFile?: string): string | undefined {
  const name = resolveWorkspacePath(ref, fromFile)
  return name === null ? undefined : getFile(workspace, name)?.content
}

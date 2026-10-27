/**
 * How an Arazzo entry file's `sourceDescriptions` map onto workspace files.
 * Users think in files, so a source's `url` is matched to a file by name:
 *
 * - a relative `url` (`./petstore.yaml`, `specs/petstore.yaml`) names the
 *   workspace file at that path, relative to the entry file's folder;
 * - an absolute `url` names the file "Save to workspace" would create for it:
 *   its last path segment. That's how a fetched source keeps working offline
 *   once saved, without rewriting the `url` in the document.
 *
 * Nothing is guessed: a `url` that matches no file exactly is missing, and two
 * absolute `url`s that would share a file name match neither.
 *
 * Everything here is pure, so the playground and its tests share it.
 */
import { parse } from 'yaml'
import { detectSpecType, fileNameError, getFile, resolveWorkspacePath } from './workspace'
import type { Workspace } from './workspace'

export interface SourceDescription {
  name: string
  url?: string
  type?: string
}

export type SourceMatch = SourceDescription & {
  /** Position in `sourceDescriptions` — where the library reports problems with it. */
  index: number
} & (
    | { kind: 'no-url' }
    /** Points outside the workspace (`../x.yaml` from the root). */
    | { kind: 'relative'; fileName: null }
    | { kind: 'relative'; fileName: string; found: boolean }
    /** `fileName` is null when the url has no usable last segment, or shares it with another source. */
    | { kind: 'absolute'; fileName: string | null; found: boolean }
  )

const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/

export function isAbsoluteUrl(url: string): boolean {
  return SCHEME.test(url) || url.startsWith('//')
}

/**
 * The `sourceDescriptions` of an Arazzo document, or null when the text isn't
 * (yet) a readable YAML or JSON object. Entries without a name are skipped:
 * the library reports those itself.
 */
export function readSourceDescriptions(content: string): SourceDescription[] | null {
  let document: unknown
  try {
    document = parse(content)
  } catch {
    return null
  }
  if (!document || typeof document !== 'object') return null
  const list = (document as Record<string, unknown>).sourceDescriptions
  if (!Array.isArray(list)) return []
  return list.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string') return []
    const { name, url, type } = item as Record<string, unknown>
    return [
      {
        name: name as string,
        ...(typeof url === 'string' && url !== '' ? { url } : {}),
        ...(typeof type === 'string' ? { type } : {}),
      },
    ]
  })
}

/** The file "Save to workspace" stores an absolute `url` in: its last path segment, when that's a valid file name. */
export function savedFileName(url: string): string | null {
  let path: string
  try {
    path = new URL(url, 'https://example.invalid').pathname
  } catch {
    return null
  }
  let segment = path.split('/').filter(Boolean).pop() ?? ''
  try {
    segment = decodeURIComponent(segment)
  } catch {
    return null
  }
  return segment && fileNameError(segment) === null ? segment : null
}

/** Matches each source description to a workspace file, as described at the top of this file. */
export function matchSources(workspace: Workspace, descriptions: SourceDescription[], entry: string): SourceMatch[] {
  const savedNames = descriptions.flatMap(({ url }) => (url && isAbsoluteUrl(url) ? [savedFileName(url)] : []))
  const shared = (name: string) => savedNames.filter((n) => n === name).length > 1

  return descriptions.map((description, index): SourceMatch => {
    const { url } = description
    if (!url) return { ...description, index, kind: 'no-url' }
    if (isAbsoluteUrl(url)) {
      const saved = savedFileName(url)
      const fileName = saved && !shared(saved) ? saved : null
      return { ...description, index, kind: 'absolute', fileName, found: !!fileName && !!getFile(workspace, fileName) }
    }
    const fileName = resolveWorkspacePath(url, entry)
    if (fileName === null) return { ...description, index, kind: 'relative', fileName }
    return { ...description, index, kind: 'relative', fileName, found: !!getFile(workspace, fileName) }
  })
}

/** The workspace file a matched source reads from, if there is one. */
export function matchedFile(match: SourceMatch): string | null {
  return match.kind !== 'no-url' && match.fileName !== null && match.found ? match.fileName : null
}

/**
 * The Arazzo files in `workspace` with a source description that reads `name`
 * — what stops working if `name` goes away. Each Arazzo file's `url`s are
 * matched from its own folder, as if it were the entry.
 */
export function filesReferencing(workspace: Workspace, name: string): string[] {
  return workspace.files.flatMap((file) => {
    if (file.name === name || detectSpecType(file.content) !== 'arazzo') return []
    const descriptions = readSourceDescriptions(file.content)
    if (!descriptions) return []
    return matchSources(workspace, descriptions, file.name).some((match) => matchedFile(match) === name) ? [file.name] : []
  })
}

/**
 * The file a `url` from inside `entry` reads — for nested sources, which the
 * library hands to `loadSource` by `url` alone. Same rules as `matchSources`,
 * minus the shared-name check, which needs the whole list.
 */
export function fileForUrl(url: string, entry: string): string | null {
  return isAbsoluteUrl(url) ? savedFileName(url) : resolveWorkspacePath(url, entry)
}

export interface FollowableSource {
  name: string
  /** Where to fetch it: the source's `url`, resolved against the document's own. */
  url: string
  /** The workspace file it goes in, so it matches the source afterwards. */
  fileName: string
}

/**
 * The sources of an Arazzo document fetched from `documentUrl` (and saved as
 * `documentName`) that can be fetched into the workspace alongside it: those
 * with a relative `url`, which can't be loaded any other way. Absolute ones
 * load by themselves. Sources whose `url` leaves the workspace or isn't a
 * valid file name are listed in `skipped`.
 */
export function followableSources(
  content: string,
  documentUrl: string,
  documentName: string,
): { sources: FollowableSource[]; skipped: string[] } {
  const sources: FollowableSource[] = []
  const skipped: string[] = []
  for (const { name, url } of readSourceDescriptions(content) ?? []) {
    if (!url || isAbsoluteUrl(url)) continue
    const fileName = resolveWorkspacePath(url, documentName)
    let absolute: string | null = null
    try {
      absolute = new URL(url, documentUrl).href
    } catch {
      // `documentUrl` isn't absolute — nothing to resolve against.
    }
    if (fileName === null || fileNameError(fileName) !== null || absolute === null) skipped.push(name)
    else if (!sources.some((source) => source.fileName === fileName)) sources.push({ name, url: absolute, fileName })
  }
  return { sources, skipped }
}

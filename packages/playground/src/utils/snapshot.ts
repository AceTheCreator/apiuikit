import { isWorkspace, singleFileWorkspace } from './workspace'
import type { WorkspaceFile } from './workspace'

// Kept free of browser APIs and dependencies: netlify/functions/share.mts
// imports this to validate uploads with exactly the rules the client reads by.

/** The pre-workspace format: one document. Still read, never written. */
export interface PlaygroundSnapshotV1 {
  v: 1
  doc: string
  config: string
}

/**
 * Everything needed to reproduce a playground session. `config` is the raw
 * config editor text rather than the parsed value, so a mid-edit (invalid)
 * config round-trips exactly.
 */
export interface PlaygroundSnapshot {
  v: 2
  files: WorkspaceFile[]
  /** The rendered file. */
  entry: string
  /** The file open in the editor, when it isn't the entry. */
  active?: string
  config: string
}

function isSnapshotV1(value: unknown): value is PlaygroundSnapshotV1 {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.v === 1 && typeof v.doc === 'string' && typeof v.config === 'string'
}

export function isSnapshot(value: unknown): value is PlaygroundSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.v !== 2 || typeof v.config !== 'string' || !isWorkspace(v)) return false
  return v.active === undefined || (typeof v.active === 'string' && v.files.some((f) => f.name === v.active))
}

/** Any snapshot version this build can read — what the share function accepts. */
export function isKnownSnapshot(value: unknown): boolean {
  return isSnapshot(value) || isSnapshotV1(value)
}

/**
 * Validates a snapshot of any known version and brings it up to the current
 * one. A v1 document becomes a one-file workspace named after its spec type
 * (`openapi.json`, `asyncapi.yaml`, …). Returns null for anything else.
 */
export function migrateSnapshot(value: unknown): PlaygroundSnapshot | null {
  if (isSnapshot(value)) return value
  if (isSnapshotV1(value)) {
    const { files, entry } = singleFileWorkspace(value.doc)
    return { v: 2, files, entry, config: value.config }
  }
  return null
}

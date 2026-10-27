import { ArazzoRenderer, AsyncAPIRenderer, OpenAPIRenderer, defaultConfig } from 'apiuikit'
import type { ArazzoDiagnostic, ConfigInterface } from 'apiuikit'
import type { ApiuikitPlugin } from 'apiuikit/plugin'
import 'apiuikit/style.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DiagnosticsPanel } from './components/DiagnosticsPanel'
import type { ParserDiagnostic } from './components/DiagnosticsPanel'
import { EditorPane } from './components/EditorPane'
import { EditorTabs, fileTab, tabFile } from './components/EditorTabs'
import type { EditorTab, TabDescriptor } from './components/EditorTabs'
import { FetchSchema } from './components/FetchSchema'
import { FileMenu, FileNameBar, NewFileButton } from './components/FileActions'
import { GitHubLink } from './components/GitHubLink'
import { ResizeHandle } from './components/ResizeHandle'
import { ShareButton } from './components/ShareButton'
import { SourcesPanel } from './components/SourcesPanel'
import type { RemoteSource, SourceRow } from './components/SourcesPanel'
import { ThemePresetsMenu } from './components/ThemePresetsMenu'
import { ThemeToggle } from './components/ThemeToggle'
import { ViewToggle } from './components/ViewToggle'
import { DEFAULT_SUGGESTED_SCHEMA, SUGGESTED_SCHEMAS } from './data/suggestedSchemas'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useJsonEditor } from './hooks/useJsonEditor'
import { useResizableSplit } from './hooks/useResizableSplit'
import { scrollbarStyle, UI_PALETTES } from './theme'
import type { UiMode } from './theme'
import { fileForUrl, filesReferencing, isAbsoluteUrl, matchSources, matchedFile, readSourceDescriptions } from './utils/arazzoSources'
import type { SourceMatch } from './utils/arazzoSources'
import { fetchDocumentText } from './utils/fetchDocument'
import { netlifyTheme } from './themes/netlify'
import { applyPreset } from './themes/presets'
import type { ThemePreset } from './themes/presets'
import {
  clearShareId,
  createShare,
  fetchShare,
  readShareId,
  readStoredSnapshot,
  writeStoredSnapshot,
} from './utils/playgroundState'
import type { PlaygroundSnapshot } from './utils/playgroundState'
import {
  addFile,
  deleteFile,
  detectSpecType,
  fileLanguage,
  fileNameFromUrl,
  getEntryFile,
  getFile,
  isWorkspace,
  renameFile,
  restoreFile,
  setEntryFile,
  singleFileWorkspace,
  uniqueFileName,
  updateFileContent,
} from './utils/workspace'
import type { Workspace, WorkspaceFile } from './utils/workspace'

const DEFAULT_WORKSPACE = singleFileWorkspace(
  DEFAULT_SUGGESTED_SCHEMA.content,
  fileNameFromUrl(DEFAULT_SUGGESTED_SCHEMA.url, DEFAULT_SUGGESTED_SCHEMA.content),
)
const NEW_FILE_NAME = 'untitled.yaml'
const SPEC_LABELS = { openapi: 'OpenAPI', asyncapi: 'AsyncAPI', arazzo: 'Arazzo' } as const
/**
 * A `sources` key the library ignores (source names match `[A-Za-z0-9_-]+`).
 * Changing its value makes the renderer resolve the document again, for what
 * the named sources don't cover: files that nested Arazzo sources read through
 * `loadSource`, and retried fetches.
 */
const RESOLVE_REVISION_KEY = 'playground revision'
const UI_MODE_STORAGE_KEY = 'apiuikit-playground-ui-mode'
const PLAYGROUND_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
const MARKDOWN_CANDIDATES_BY_LENGTH = new Map<number, Array<{ content: string; path: string }>>()
for (const { content, markdownPath } of SUGGESTED_SCHEMAS) {
  if (content === undefined || markdownPath === undefined) continue
  const candidates = MARKDOWN_CANDIDATES_BY_LENGTH.get(content.length) ?? []
  candidates.push({ content, path: markdownPath })
  MARKDOWN_CANDIDATES_BY_LENGTH.set(content.length, candidates)
}

function readStoredUiMode(): UiMode | null {
  try {
    const stored = localStorage.getItem(UI_MODE_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

/**
 * The playground boots on the Netlify theme rather than the library's own
 * defaults. Spread over `defaultConfig.theme` rather than replacing it so
 * non-color theme settings (currently `depthColors`) still come from the
 * library. Only the playground is affected — `defaultConfig` itself is
 * untouched, so consumers of the package get the shipped default look.
 */
const DEFAULT_CONFIG: ConfigInterface = {
  ...defaultConfig,
  theme: { ...defaultConfig.theme, ...netlifyTheme },
  // The preview is an embedded, independently scrolling pane. Keep overlays
  // inside the rendered docs instead of covering the browser/editor chrome.
  sidePanel: { ...defaultConfig.sidePanel, containment: 'component' },
  // On here, off everywhere else: `show.tryIt` defaults to false, and the
  // playground is exactly where you'd want to see what it does. It also puts
  // the flag in the editable config pane, so visitors can toggle it and watch
  // the panel header change.
  show: { ...defaultConfig.show, tryIt: true },
}

export interface PlaygroundProps {
  /**
   * Initial document text (JSON or YAML), as a one-file workspace.
   * Uncontrolled — only read on mount. Ignored when `initialFiles` is given.
   */
  initialDocument?: string
  /**
   * Initial workspace files, for multi-file documents. Names must be unique
   * and path-like (`specs/petstore.yaml`). Uncontrolled — only read on mount.
   */
  initialFiles?: WorkspaceFile[]
  /** Which of `initialFiles` is rendered. Defaults to the first. */
  initialEntry?: string
  /** Initial renderer config. Uncontrolled — only read on mount. */
  initialConfig?: ConfigInterface
  /** Initial UI color mode. The user can still toggle it afterwards. */
  defaultUiMode?: UiMode
  /** CSS height of the playground root. Defaults to filling the host container. */
  height?: string
  /**
   * Renderer plugins (e.g. the try-it panel) to register on the preview.
   * Pass a stable array — a fresh literal on every render re-registers the
   * plugins and resets the operation's selected tab.
   */
  plugins?: ApiuikitPlugin[]
  /**
   * Save the workspace and config text to localStorage and restore them on
   * mount (taking precedence over the `initial*` props).
   */
  persist?: boolean
  /**
   * Share-link API base (e.g. `/api/share`). When set, a Share button uploads
   * every workspace file + the config and copies a `?s=<id>` link, and a `?s=`
   * param in the page URL is loaded on mount.
   */
  shareEndpoint?: string
}

type ShareLoad = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }

/** A short-lived message at the bottom of the playground, e.g. "Deleted x. Undo". */
type Notice = { message: string; undo?: () => void }
const NOTICE_DURATION_MS = 8000

/** A file being named in the bar under the tabs. */
type Naming = { file: string; label: string } | null

function seedWorkspace(initialFiles?: WorkspaceFile[], initialEntry?: string, initialDocument?: string): Workspace {
  if (initialFiles) {
    const workspace = { files: initialFiles, entry: initialEntry ?? initialFiles[0]?.name }
    if (isWorkspace(workspace)) return workspace
    console.warn('[playground] Ignoring `initialFiles`: it needs at least one file, unique valid names, and an `initialEntry` naming one of them.')
  }
  if (initialDocument !== undefined) return singleFileWorkspace(initialDocument)
  return DEFAULT_WORKSPACE
}

export function Playground({
  initialDocument,
  initialFiles,
  initialEntry,
  initialConfig,
  defaultUiMode = 'light',
  height = '100%',
  plugins,
  persist = false,
  shareEndpoint,
}: PlaygroundProps) {
  const [uiMode, setUiMode] = useState<UiMode>(() => readStoredUiMode() ?? defaultUiMode)
  const [editorExpanded, setEditorExpanded] = useState(true)
  const palette = UI_PALETTES[uiMode]

  useEffect(() => {
    try {
      localStorage.setItem(UI_MODE_STORAGE_KEY, uiMode)
    } catch {
      // Ignore quota / private-mode failures — theme still works in-session.
    }
  }, [uiMode])

  // The renderers parse `raw` themselves via the real spec parsers and report
  // real spec diagnostics — no need for our own validation on this side.
  // Uncontrolled props: capture the mount-time values so a re-rendering parent
  // passing fresh literals doesn't reset the editors. A persisted session wins
  // over the props.
  const [seed] = useState(() => {
    const stored = persist ? readStoredSnapshot() : null
    const configSeed = initialConfig ?? DEFAULT_CONFIG
    const workspace = stored ?? seedWorkspace(initialFiles, initialEntry, initialDocument)
    return {
      workspace: { files: workspace.files, entry: workspace.entry },
      active: stored?.active ?? workspace.entry,
      configText: stored?.config ?? JSON.stringify(configSeed, null, 2),
      configSeed,
    }
  })
  const [workspace, setWorkspace] = useState<Workspace>(seed.workspace)
  // The file open in the editor. Always names a file in the workspace — every
  // update below that removes or renames files keeps it pointing at one.
  const [activeFile, setActiveFile] = useState(seed.active)
  const [configOpen, setConfigOpen] = useState(false)
  const [naming, setNaming] = useState<Naming>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const showNotice = (next: Notice) => {
    clearTimeout(noticeTimer.current)
    setNotice(next)
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_DURATION_MS)
  }
  useEffect(() => () => clearTimeout(noticeTimer.current), [])
  const activeTab: EditorTab = configOpen ? 'config' : fileTab(activeFile)
  const openFile = (name: string) => {
    setActiveFile(name)
    setConfigOpen(false)
  }
  const handleTabChange = (tab: EditorTab) => {
    const file = tabFile(tab)
    if (file === null) setConfigOpen(true)
    else openFile(file)
  }

  const replaceWorkspace = (next: Workspace, active = next.entry) => {
    setWorkspace(next)
    setNaming(null)
    // An Undo from the old workspace would restore into the new one.
    setNotice(null)
    openFile(active)
  }

  const entryFile = getEntryFile(workspace)
  const currentFile = getFile(workspace, activeFile) ?? entryFile
  // Parsing hits the real spec-validating parser (~500ms) — debounce so typing doesn't
  // fire a fresh parse on every keystroke. The whole workspace is debounced at
  // once, so the entry's name and text, and the Arazzo sources read alongside
  // it, always come from the same moment, and diagnostics are attributed to the
  // files the renderer actually parsed. Editing another file keeps the entry
  // file's object, so the OpenAPI and AsyncAPI renderers don't re-parse.
  const debouncedWorkspace = useDebouncedValue(workspace, 400)
  const debouncedEntry = getEntryFile(debouncedWorkspace)
  const [rendererDiagnostics, setRendererDiagnostics] = useState<ParserDiagnostic[]>([])
  const diagnostics = useMemo(
    () => rendererDiagnostics.map((d) => ({ ...d, file: d.file ?? debouncedEntry.name })),
    [rendererDiagnostics, debouncedEntry.name],
  )
  const filesWithErrors = useMemo(
    () => new Set(diagnostics.filter((d) => d.severity === 0).map((d) => d.file)),
    [diagnostics],
  )

  // Sniffs the entry file's own top-level key to pick which renderer/parser to
  // hand it to, rather than asking the user to choose. Defaults to AsyncAPI
  // when neither key is found (e.g. mid-edit/empty doc).
  const specType = useMemo(() => detectSpecType(entryFile.content) ?? 'asyncapi', [entryFile.content])
  const specLabel = SPEC_LABELS[specType]

  const config = useJsonEditor<ConfigInterface>(seed.configText, seed.configSeed, {
    emptyValue: seed.configSeed,
  })
  const { onChange: setConfigText } = config

  // A `?s=<id>` share link replaces whatever was seeded above once it loads.
  const [shareLoad, setShareLoad] = useState<ShareLoad>(() =>
    shareEndpoint && readShareId() ? { status: 'loading' } : { status: 'idle' },
  )
  const shareFetchStarted = useRef(false) // StrictMode runs mount effects twice
  useEffect(() => {
    if (!shareEndpoint || shareFetchStarted.current) return
    const id = readShareId()
    if (!id) return
    shareFetchStarted.current = true
    fetchShare(shareEndpoint, id)
      .then((snapshot) => {
        setWorkspace({ files: snapshot.files, entry: snapshot.entry })
        setActiveFile(snapshot.active ?? snapshot.entry)
        setConfigOpen(false)
        setConfigText(snapshot.config)
        // From here on the session is the user's own — a reload should restore
        // their edits from localStorage, not re-fetch the original share.
        clearShareId()
        setShareLoad({ status: 'idle' })
      })
      .catch((err: Error) => setShareLoad({ status: 'error', message: err.message }))
  }, [shareEndpoint, setConfigText])

  const snapshot = useMemo<PlaygroundSnapshot>(
    () => ({
      v: 2,
      files: workspace.files,
      entry: workspace.entry,
      ...(activeFile !== workspace.entry ? { active: activeFile } : {}),
      config: config.text,
    }),
    [workspace, activeFile, config.text],
  )

  // Debounced so typing in a large spec doesn't re-serialize it on every keystroke.
  const persistedSnapshot = useDebouncedValue(snapshot, 500)
  useEffect(() => {
    // Hold off while a share link loads so the pre-share state isn't written over it.
    if (!persist || shareLoad.status === 'loading') return
    writeStoredSnapshot(persistedSnapshot)
  }, [persist, shareLoad.status, persistedSnapshot])

  // Reopening the share dialog without editing reuses the last link instead of
  // re-uploading (ids are content hashes, so it would be the same link anyway).
  const lastShare = useRef<{ body: string; url: string } | null>(null)
  const handleShare = async () => {
    const body = JSON.stringify(snapshot)
    const last = lastShare.current
    if (last && last.body === body) return last.url
    const url = await createShare(shareEndpoint!, snapshot)
    lastShare.current = { body, url }
    return url
  }

  // theme.mode typed directly into the config editor is authoritative for the
  // preview — the toggle only supplies a mode when the config doesn't set one
  // itself, so editing `mode` in the JSON has a visible effect instead of
  // being silently overwritten by whatever the toggle last set.
  const configuredMode = config.value.theme?.mode
  const previewConfig = useMemo<ConfigInterface>(
    () => ({
      ...config.value,
      theme: { ...config.value.theme, mode: configuredMode ?? uiMode },
    }),
    [config.value, configuredMode, uiMode],
  )

  // Keep the toggle (and the playground's own chrome, which is themed by
  // uiMode) in sync when the user edits theme.mode directly in the config
  // editor, so the button always reflects what's actually being rendered.
  useEffect(() => {
    if (configuredMode === 'light' || configuredMode === 'dark') {
      setUiMode(configuredMode)
    }
  }, [configuredMode])

  // The toggle writes back into the config editor's own text, not just local
  // state, so clicking it and editing theme.mode by hand are two views onto
  // the same value rather than the toggle silently winning.
  const handleUiModeChange = (nextMode: UiMode) => {
    setUiMode(nextMode)
    config.onChange(
      JSON.stringify(
        { ...config.value, theme: { ...config.value.theme, mode: nextMode } },
        null,
        2,
      ),
    )
  }

  // Same write-back as the mode toggle: the preset lands in the config text, so
  // it persists, shares, and stays hand-editable like any other edit.
  const handlePresetSelect = (preset: ThemePreset) => {
    config.onChange(
      JSON.stringify(
        { ...config.value, theme: applyPreset(config.value.theme ?? {}, preset) },
        null,
        2,
      ),
    )
  }

  // Handlers below can run after an await (fetches) or from a stale render's
  // closure, so they read the latest workspace rather than the rendered one.
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace
  const isMultiFile = workspace.files.length > 1
  const tabDomId = (name: string) => `playground-tab-file-${workspace.files.findIndex((f) => f.name === name)}`

  // --- Arazzo: each source description is read from the workspace file its
  // `url` names (see utils/arazzoSources), or fetched when its `url` is
  // absolute and no file matches.
  const debouncedWorkspaceRef = useRef(debouncedWorkspace)
  debouncedWorkspaceRef.current = debouncedWorkspace
  // Mid-edit, the entry may not parse; keep the last list rather than
  // flashing the panel away.
  const lastMatches = useRef<SourceMatch[]>([])
  const sourceMatches = useMemo(() => {
    if (detectSpecType(debouncedEntry.content) !== 'arazzo') return (lastMatches.current = [])
    const descriptions = readSourceDescriptions(debouncedEntry.content)
    if (descriptions) lastMatches.current = matchSources(debouncedWorkspace, descriptions, debouncedEntry.name)
    return lastMatches.current
  }, [debouncedWorkspace, debouncedEntry])
  const sourceMatchesRef = useRef(sourceMatches)
  sourceMatchesRef.current = sourceMatches

  // Absolute urls with no matching file, fetched once per session (and again on Retry).
  const [remoteSources, setRemoteSources] = useState<Record<string, RemoteSource>>({})
  const remoteLoads = useRef(new Map<string, Promise<string>>())
  const [retries, setRetries] = useState(0)
  // Workspace files nested Arazzo sources were read from, so editing one re-resolves.
  const nestedReads = useRef(new Set<string>())

  const fetchRemoteSource = useCallback((url: string) => {
    let load = remoteLoads.current.get(url)
    if (!load) {
      setRemoteSources((current) => ({ ...current, [url]: { status: 'loading' } }))
      load = fetchDocumentText(url).then(
        (content) => {
          setRemoteSources((current) => ({ ...current, [url]: { status: 'loaded', content } }))
          return content
        },
        (err: Error) => {
          setRemoteSources((current) => ({ ...current, [url]: { status: 'failed', message: err.message } }))
          throw err
        },
      )
      remoteLoads.current.set(url, load)
    }
    return load
  }, [])

  // Called by the library for every source not in `arazzoSources`: missing
  // files, absolute urls, and the sources of nested Arazzo documents.
  const loadArazzoSource = useCallback(
    (url: string) => {
      const ws = debouncedWorkspaceRef.current
      // A top-level source keeps the match the panel shows; only nested ones are matched here.
      const topLevel = sourceMatchesRef.current.find((match) => match.url === url)
      const name = topLevel ? matchedFile(topLevel) : fileForUrl(url, ws.entry)
      const file = name ? getFile(ws, name) : undefined
      if (file) {
        if (!topLevel) nestedReads.current.add(file.name)
        return file.content
      }
      return isAbsoluteUrl(url) ? fetchRemoteSource(url) : undefined
    },
    [fetchRemoteSource],
  )

  const arazzoSources = useMemo(() => {
    const sources: Record<string, string> = {}
    for (const match of sourceMatches) {
      const name = matchedFile(match)
      const file = name ? getFile(debouncedWorkspace, name) : undefined
      if (file) sources[match.name] = file.content
    }
    const nested = [...nestedReads.current].map((name) => getFile(debouncedWorkspace, name)?.content ?? null)
    sources[RESOLVE_REVISION_KEY] = JSON.stringify([retries, nested])
    return sources
  }, [sourceMatches, debouncedWorkspace, retries])

  const retryRemoteSource = (url: string) => {
    remoteLoads.current.delete(url)
    setRetries((n) => n + 1)
  }

  // Diagnostics about a source the workspace holds go to that file; the rest
  // (fetched or nested sources) stay with the entry, naming the source. A
  // source with no matching file is reported in the playground's own terms:
  // the library only knows that `loadSource` came back empty.
  const attributeArazzoDiagnostics = (items: ArazzoDiagnostic[]): ParserDiagnostic[] =>
    items.map(({ source, ...item }) => {
      if (!source) {
        const [field, index] = item.path
        const missing = field === 'sourceDescriptions' && item.path.length === 2
          ? sourceMatchesRef.current.find((m) => String(m.index) === index && m.kind === 'relative' && !matchedFile(m))
          : undefined
        if (!missing || missing.kind !== 'relative') return item
        return {
          ...item,
          message: missing.fileName
            ? `Source “${missing.name}”: no file “${missing.fileName}” in the workspace.`
            : `Source “${missing.name}”: “${missing.url}” points above the workspace’s top folder.`,
        }
      }
      const match = sourceMatchesRef.current.find((m) => m.name === source)
      const file = match ? matchedFile(match) : null
      return file ? { ...item, file } : { ...item, message: `Source “${source}”: ${item.message}` }
    })

  // Problems the library found with a source's document, reported at its
  // `sourceDescriptions` entry: the panel shows them on the source's row.
  const sourceRows: SourceRow[] = sourceMatches.map((match) => {
    const problem = rendererDiagnostics.find(
      (d) => !d.file && d.severity === 0 && d.path?.length === 2 && d.path[0] === 'sourceDescriptions' && d.path[1] === String(match.index),
    )?.message
    const remote = match.kind === 'absolute' && !matchedFile(match) && match.url ? remoteSources[match.url] : undefined
    return { match, remote, problem }
  })

  const handleAddFile = (name: string, content: string): string | null => {
    const result = addFile(workspaceRef.current, { name, content })
    if ('error' in result) return result.error
    workspaceRef.current = result.workspace
    setWorkspace(result.workspace)
    return null
  }

  const handleFileEdit = (name: string, content: string) => {
    setWorkspace((ws) => updateFileContent(ws, name, content))
  }

  const handleNewFile = () => {
    const ws = workspaceRef.current
    const name = uniqueFileName(ws, NEW_FILE_NAME)
    const result = addFile(ws, { name, content: '' })
    if ('error' in result) return
    setWorkspace(result.workspace)
    openFile(name)
    setNaming({ file: name, label: 'Name the new file' })
  }

  const startRename = (name: string) => {
    openFile(name)
    setNaming({ file: name, label: `Rename ${name}` })
  }

  const submitName = (to: string): string | null => {
    if (!naming) return null
    const ws = workspaceRef.current
    const result = renameFile(ws, naming.file, to)
    if ('error' in result) return result.error
    setWorkspace(result.workspace)
    if (activeFile === naming.file) setActiveFile(to)
    setNaming(null)
    // Renaming keeps the file's position, so its tab keeps its DOM id.
    const index = ws.files.findIndex((f) => f.name === naming.file)
    requestAnimationFrame(() => document.getElementById(`playground-tab-file-${index}`)?.focus())
    return null
  }

  const handleSetEntry = (name: string) => {
    const result = setEntryFile(workspaceRef.current, name)
    if ('workspace' in result) setWorkspace(result.workspace)
  }

  // Deleting takes effect at once; the notice it shows can put the file back.
  const handleDelete = (name: string) => {
    const ws = workspaceRef.current
    const index = ws.files.findIndex((f) => f.name === name)
    const result = deleteFile(ws, name)
    if ('error' in result) return
    const file = ws.files[index]
    const wasEntry = ws.entry === name
    workspaceRef.current = result.workspace
    setWorkspace(result.workspace)
    if (activeFile === name) openFile(result.workspace.entry)
    if (naming?.file === name) setNaming(null)

    const referencedBy = filesReferencing(ws, name)
    const details = [
      wasEntry && `${result.workspace.entry} is now the entry.`,
      referencedBy.length > 0 && `Still referenced by ${referencedBy.join(', ')}.`,
    ].filter(Boolean)
    showNotice({
      message: [`Deleted ${name}.`, ...details].join(' '),
      undo: () => {
        const restored = restoreFile(workspaceRef.current, file, index, wasEntry)
        if ('error' in restored) {
          showNotice({ message: `Couldn’t restore ${name}: ${restored.error}.` })
          return
        }
        workspaceRef.current = restored.workspace
        setWorkspace(restored.workspace)
        openFile(name)
        setNotice(null)
      },
    })
  }

  // A fetched URL replaces a one-file workspace (exactly what Fetch did before
  // workspaces), but joins a multi-file one as a new file — there, replacing
  // would silently throw away every other file.
  const handleFetchedDocument = (file: WorkspaceFile): string => {
    const ws = workspaceRef.current
    if (ws.files.length <= 1) {
      const next = singleFileWorkspace(file.content, file.name)
      workspaceRef.current = next
      replaceWorkspace(next)
      return file.name
    }
    const name = uniqueFileName(ws, file.name)
    const result = addFile(ws, { name, content: file.content })
    if ('error' in result) return name
    workspaceRef.current = result.workspace
    setWorkspace(result.workspace)
    openFile(name)
    return name
  }

  // Sources fetched next to an Arazzo document. A file with that name and
  // different content is only replaced when asked — the user may have edited it.
  const handleAddSources = (files: WorkspaceFile[], replace: boolean): string[] => {
    let ws = workspaceRef.current
    const kept: string[] = []
    for (const file of files) {
      const existing = getFile(ws, file.name)
      if (!existing) {
        const result = addFile(ws, file)
        if ('workspace' in result) ws = result.workspace
      } else if (existing.content !== file.content) {
        if (replace) ws = updateFileContent(ws, file.name, file.content)
        else kept.push(file.name)
      }
    }
    workspaceRef.current = ws
    setWorkspace(ws)
    return kept
  }

  const fileTabs: TabDescriptor[] = workspace.files.map((file, index) => ({
    id: fileTab(file.name),
    domId: `playground-tab-file-${index}`,
    label: file.name,
    hasError: filesWithErrors.has(file.name),
    // With one file there's nothing to tell apart — keep the tab plain.
    isEntry: isMultiFile && file.name === workspace.entry,
    onRename: () => startRename(file.name),
    // The last file can't be deleted, so it gets no ×.
    onDelete: isMultiFile ? () => handleDelete(file.name) : undefined,
  }))
  const configTab: TabDescriptor = {
    id: 'config',
    domId: 'playground-tab-config',
    label: 'Config',
    hasError: config.error != null,
  }

  const { containerRef, splitPercent, handlePointerDown, nudge } = useResizableSplit()

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        height,
        position: 'relative',
        background: palette.chromeBg,
        fontFamily: PLAYGROUND_FONT_FAMILY,
      }}
    >
      <div
        className="playground-preview-scroll"
        style={{ width: editorExpanded ? `${splitPercent}%` : '100%', overflow: 'auto' }}
      >
        <style>{scrollbarStyle('.playground-preview-scroll', palette)}</style>
        {specType === 'arazzo' ? (
          <ArazzoRenderer
            raw={debouncedEntry.content}
            sources={arazzoSources}
            loadSource={loadArazzoSource}
            config={previewConfig}
            plugins={plugins}
            onDiagnostics={(d) => setRendererDiagnostics(attributeArazzoDiagnostics(d))}
          />
        ) : specType === 'openapi' ? (
          <OpenAPIRenderer
            raw={debouncedEntry.content}
            config={previewConfig}
            plugins={plugins}
            onDiagnostics={(d) => setRendererDiagnostics(d as ParserDiagnostic[])}
          />
        ) : (
          <AsyncAPIRenderer
            raw={debouncedEntry.content}
            config={previewConfig}
            onDiagnostics={(d) => setRendererDiagnostics(d as ParserDiagnostic[])}
          />
        )}
      </div>

      {editorExpanded && (
        <>
          <ResizeHandle splitPercent={splitPercent} onPointerDown={handlePointerDown} onNudge={nudge} palette={palette} />

          <div style={{ display: 'flex', flexDirection: 'column', width: `${100 - splitPercent}%` }}>
            <EditorTabs
              activeTab={activeTab}
              onChange={handleTabChange}
              palette={palette}
              fileTabs={fileTabs}
              pinnedTabs={[configTab]}
              actions={
                <>
                  <NewFileButton palette={palette} onClick={handleNewFile} />
                  <FileMenu
                    palette={palette}
                    files={workspace.files.map((f) => ({ name: f.name, isEntry: f.name === workspace.entry }))}
                    activeFile={configOpen ? null : currentFile.name}
                    onOpen={openFile}
                    onRename={startRename}
                    onSetEntry={handleSetEntry}
                    onDelete={handleDelete}
                  />
                </>
              }
              trailing={
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '6px' }}>
                  {shareEndpoint && <ShareButton palette={palette} onShare={handleShare} />}
                  <GitHubLink palette={palette} />
                  <ThemeToggle mode={uiMode} palette={palette} onChange={handleUiModeChange} />
                  <ViewToggle expanded palette={palette} onChange={setEditorExpanded} />
                </div>
              }
            />
            {naming && (
              <FileNameBar
                key={naming.file}
                palette={palette}
                label={naming.label}
                initialName={naming.file}
                onSubmit={submitName}
                onCancel={() => setNaming(null)}
              />
            )}
            <div
              id="playground-editor-panel"
              role="tabpanel"
              aria-labelledby={configOpen ? configTab.domId : tabDomId(currentFile.name)}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
              {!configOpen ? (
                <>
                  <FetchSchema
                    palette={palette}
                    onLoadDocument={handleFetchedDocument}
                    onAddSources={handleAddSources}
                    onLoadWorkspace={(ws) => replaceWorkspace(ws)}
                    hint={isMultiFile ? 'Fetching adds the document as a new file. Examples replace the workspace.' : undefined}
                  />
                  <EditorPane
                    // Remount per file so undo history never crosses into another file.
                    key={currentFile.name}
                    ariaLabel={
                      currentFile.name === workspace.entry
                        ? `${currentFile.name} (${specLabel} document, rendered)`
                        : currentFile.name
                    }
                    value={currentFile.content}
                    onChange={(content) => handleFileEdit(currentFile.name, content)}
                    error={null}
                    mode={uiMode}
                    palette={palette}
                    language={fileLanguage(currentFile.name, currentFile.content)}
                  />
                  {specType === 'arazzo' && (
                    <SourcesPanel
                      palette={palette}
                      rows={sourceRows}
                      onOpenFile={openFile}
                      onAddFile={handleAddFile}
                      fetchText={fetchDocumentText}
                      onRetry={retryRemoteSource}
                    />
                  )}
                  <DiagnosticsPanel
                    diagnostics={diagnostics}
                    palette={palette}
                    groupByFile={isMultiFile}
                    onSelectFile={openFile}
                  />
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      padding: '8px',
                      borderBottom: `1px solid ${palette.chromeBorder}`,
                      background: palette.chromeBg,
                      transition: 'background 150ms ease, border-color 150ms ease',
                    }}
                  >
                    <ThemePresetsMenu
                      palette={palette}
                      theme={config.value.theme}
                      onSelect={handlePresetSelect}
                      // config.value is the last *valid* parse — applying over
                      // invalid text would silently throw the user's edit away.
                      disabled={config.error != null}
                    />
                  </div>
                  <EditorPane
                    ariaLabel="Config JSON"
                    value={config.text}
                    onChange={config.onChange}
                    error={config.error}
                    mode={uiMode}
                    palette={palette}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {shareLoad.status !== 'idle' && (
        <div
          role={shareLoad.status === 'error' ? 'alert' : 'status'}
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 10px',
            fontSize: '13px',
            background: shareLoad.status === 'error' ? palette.errorBg : palette.chromeBg,
            color: shareLoad.status === 'error' ? palette.errorText : palette.textPrimary,
            border: `1px solid ${shareLoad.status === 'error' ? palette.errorBorder : palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 50,
          }}
        >
          {shareLoad.status === 'loading' ? 'Loading shared spec…' : shareLoad.message}
          {shareLoad.status === 'error' && (
            <button
              type="button"
              onClick={() => setShareLoad({ status: 'idle' })}
              aria-label="Dismiss"
              style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: '14px', padding: 0 }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: 'calc(100% - 32px)',
            padding: '8px 12px',
            fontSize: '13px',
            background: palette.chromeBg,
            color: palette.textPrimary,
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 50,
          }}
        >
          <span>{notice.message}</span>
          {notice.undo && (
            <button
              type="button"
              onClick={notice.undo}
              style={{
                border: 'none',
                background: 'transparent',
                color: palette.focusRing,
                fontWeight: 600,
                fontFamily: 'inherit',
                fontSize: 'inherit',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            style={{ border: 'none', background: 'transparent', color: palette.textMuted, cursor: 'pointer', fontSize: '14px', padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {!editorExpanded && (
        <div
          style={{
            // Absolute (not fixed) so the toolbar pins to the playground container,
            // which may be embedded partway down a host page.
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px',
            background: palette.chromeBg,
            border: `1px solid ${palette.chromeBorder}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 40,
          }}
        >
          {shareEndpoint && <ShareButton palette={palette} onShare={handleShare} />}
          <GitHubLink palette={palette} />
          <ThemeToggle mode={uiMode} palette={palette} onChange={handleUiModeChange} />
          <ViewToggle expanded={false} palette={palette} onChange={setEditorExpanded} />
        </div>
      )}
    </div>
  )
}

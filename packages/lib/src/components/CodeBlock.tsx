import { useEffect, useId, useRef, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { hljs } from '../helpers/marked';
import IconCopy from '../icons/Copy';
import IconCheck from '../icons/Check';
import IconArrowDown from '../icons/ArrowDown';

interface CodeBlockProps {
  code: string;
  className?: string;
  language?: string;
  /** Height in px past which the block is clipped behind a "show all" toggle. */
  collapsedMaxHeight?: number;
}

const RESET_DELAY_MS = 1500;

const DEFAULT_COLLAPSED_MAX_HEIGHT_PX = 320;

/** Blocks only a few lines past the cap render in full: clipping them would
 * cost a toggle and a fade to hide almost nothing. */
const OVERFLOW_SLACK_PX = 48;

/** night-owl's `.hljs` background (see the highlight.js theme imported by
 * helpers/marked). The fade has to match it exactly, and the theme is a fixed
 * dark one rather than a token that follows light/dark mode. */
const CODE_BACKGROUND = '#011627';

type CopyStatus = 'idle' | 'copied' | 'error';

/** Legacy fallback for browsers/contexts without the async Clipboard API
 * (insecure origins, older Safari, permission-restricted iframes). */
function copyViaExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyViaExecCommand(text);
  }
}

export function CodeBlock({
  code,
  className,
  language = 'json',
  collapsedMaxHeight = DEFAULT_COLLAPSED_MAX_HEIGHT_PX,
}: CodeBlockProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const preId = useId();

  useEffect(() => () => clearTimeout(resetTimeout.current), []);

  // scrollHeight is the full content height whether or not the block is
  // currently clipped, so this measures the same in both states and can't
  // oscillate between them.
  useEffect(() => {
    const el = preRef.current;
    if (!el) return;

    const checkOverflow = () =>
      setCanExpand(el.scrollHeight > collapsedMaxHeight + OVERFLOW_SLACK_PX);
    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [code, language, collapsedMaxHeight]);

  const handleCopy = () => {
    void copyToClipboard(code).then((success) => {
      setStatus(success ? 'copied' : 'error');
      clearTimeout(resetTimeout.current);
      resetTimeout.current = setTimeout(() => setStatus('idle'), RESET_DELAY_MS);
    });
  };

  // A caller (e.g. CodeSamples' dropdown) can pass a language whose grammar
  // is still being lazy-loaded, or one with no highlight.js grammar at all
  // (httpsnippet's "agent" prompt target). hljs.highlight() throws on an
  // unregistered language, so fall back to plain, React-escaped text rather
  // than crash — no dangerouslySetInnerHTML needed in that branch since
  // there's no generated markup to sanitize.
  const registered = hljs.getLanguage(language);
  const highlighted = registered ? hljs.highlight(code, { language }).value : null;
  const label = status === 'copied' ? 'Copied' : status === 'error' ? 'Copy failed' : 'Copy to clipboard';
  const clipped = canExpand && !expanded;
  const lineCount = code.replace(/\n+$/, '').split('\n').length;

  const toggleExpanded = () => {
    // Collapsing a block taller than the viewport can leave the reader parked
    // below where it now ends, so pull its top back into view when it has
    // scrolled off the top.
    if (expanded && (containerRef.current?.getBoundingClientRect().top ?? 0) < 0) {
      containerRef.current?.scrollIntoView({ block: 'nearest' });
    }
    setExpanded((v) => !v);
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={label}
        title={label}
        className="absolute top-2 right-2 z-10 p-1 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-neutral-100 transition-colors"
      >
        {status === 'copied' ? (
          <IconCheck className="w-4 h-4 text-green-600" />
        ) : (
          <IconCopy className={`w-4 h-4 ${status === 'error' ? 'text-red-500' : ''}`} />
        )}
      </button>
      <div className="relative">
        <pre
          ref={preRef}
          id={preId}
          style={clipped ? { maxHeight: collapsedMaxHeight } : undefined}
          className={`text-xs rounded overflow-x-auto ${clipped ? 'overflow-y-hidden' : ''}`}
        >
          {highlighted !== null ? (
            <code
              className={`hljs language-${language}`}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlighted) }}
            />
          ) : (
            <code className="hljs">{code}</code>
          )}
        </pre>
        {clipped && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 rounded-b"
            style={{ background: `linear-gradient(to bottom, transparent, ${CODE_BACKGROUND})` }}
          />
        )}
      </div>
      {canExpand && (
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-controls={preId}
          className="flex items-center gap-1 mt-1 px-1 py-0.5 rounded text-xs text-foreground-muted hover:text-foreground-secondary transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${lineCount} lines`}
          <IconArrowDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

export default CodeBlock;

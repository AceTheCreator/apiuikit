import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { hljs } from '../helpers/marked';
import IconClipboard from '../icons/Clipboard';
import IconCheck from '../icons/Check';

interface CodeBlockProps {
  code: string;
  className?: string;
  language?: string;
}

const RESET_DELAY_MS = 1500;

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

export function CodeBlock({ code, className, language = 'json' }: CodeBlockProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetTimeout.current), []);

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

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={label}
        title={label}
        className="absolute top-2 right-2 p-1 rounded text-foreground-muted hover:text-foreground-secondary hover:bg-neutral-100 transition-colors"
      >
        {status === 'copied' ? (
          <IconCheck className="w-4 h-4 text-green-600" />
        ) : (
          <IconClipboard className={`w-4 h-4 ${status === 'error' ? 'text-red-500' : ''}`} />
        )}
      </button>
      <pre className="text-xs rounded overflow-x-auto">
        {highlighted !== null ? (
          <code
            className={`hljs language-${language}`}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlighted) }}
          />
        ) : (
          <code className="hljs">{code}</code>
        )}
      </pre>
    </div>
  );
}

export default CodeBlock;

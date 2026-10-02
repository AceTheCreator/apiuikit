import { useCallback, useState } from 'react'

interface UseJsonEditorOptions<T> {
  /** Value to fall back to when the editor is cleared, instead of treating it as a parse error. */
  emptyValue?: T
}

function parseText<T>(text: string, emptyValue: T | undefined): { value: T } | { error: string } {
  if (emptyValue !== undefined && text.trim() === '') return { value: emptyValue }
  try {
    return { value: JSON.parse(text) as T }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

/**
 * `initialValue` is used while `initialText` doesn't parse (e.g. a restored
 * mid-edit config), in which case the parse error is reported from the start.
 */
export function useJsonEditor<T>(initialText: string, initialValue: T, options: UseJsonEditorOptions<T> = {}) {
  const [initial] = useState(() => parseText(initialText, options.emptyValue))
  const [text, setText] = useState(initialText)
  const [value, setValue] = useState<T>('value' in initial ? initial.value : initialValue)
  const [error, setError] = useState<string | null>('error' in initial ? initial.error : null)

  const onChange = useCallback(
    (nextText: string) => {
      setText(nextText)
      const result = parseText(nextText, options.emptyValue)
      if ('value' in result) {
        setValue(result.value)
        setError(null)
      } else {
        setError(result.error)
      }
    },
    [options.emptyValue],
  )

  return { text, value, error, onChange }
}

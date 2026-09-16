import { useEffect, useState } from 'react'
import { parseComponentLibrary } from '../library'
import type { ComponentLibrary } from '../types'

export function useComponentLibrary(): {
  library: ComponentLibrary | null
  error: string | null
} {
  const [library, setLibrary] = useState<ComponentLibrary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}components.json`
    let cancelled = false
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load component library (${response.status}).`)
        }
        return parseComponentLibrary(await response.json())
      })
      .then((parsed) => {
        if (!cancelled) setLibrary(parsed)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load component library.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { library, error }
}

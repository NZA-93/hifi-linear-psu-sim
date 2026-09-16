import { useEffect, useState } from 'react'

export function useJsonResource<T>(relativePath: string, parse: (data: unknown) => T): {
  data: T | null
  error: string | null
} {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}${relativePath}`
    let cancelled = false
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${relativePath} (${response.status}).`)
        }
        return parse(await response.json())
      })
      .then((parsed) => {
        if (!cancelled) setData(parsed)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : `Unable to load ${relativePath}.`)
        }
      })
    return () => {
      cancelled = true
    }
  }, [relativePath, parse])

  return { data, error }
}

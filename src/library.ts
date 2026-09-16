import type { ComponentLibrary, LibraryPart, ParamValue } from './types'
import { COMPONENT_TYPES } from './types'

function isParamValue(value: unknown): value is ParamValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

function isLibraryPart(value: unknown): value is LibraryPart {
  if (value === null || typeof value !== 'object') return false
  const part = value as Record<string, unknown>
  if (typeof part.id !== 'string' || part.id.length === 0) return false
  if (
    typeof part.type !== 'string' ||
    !COMPONENT_TYPES.includes(part.type as LibraryPart['type'])
  ) {
    return false
  }
  if (typeof part.label !== 'string' || part.label.length === 0) return false
  if (part.params === null || typeof part.params !== 'object' || Array.isArray(part.params)) {
    return false
  }
  for (const paramValue of Object.values(part.params as Record<string, unknown>)) {
    if (!isParamValue(paramValue)) return false
  }
  if (part.notes !== undefined && typeof part.notes !== 'string') return false
  return true
}

/** Parse and validate `components.json`. Throws if the document is not a library. */
export function parseComponentLibrary(data: unknown): ComponentLibrary {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Component library must be a JSON object.')
  }
  const doc = data as Record<string, unknown>
  if (typeof doc.schemaVersion !== 'number' || !Number.isFinite(doc.schemaVersion)) {
    throw new Error('Component library is missing numeric schemaVersion.')
  }
  if (!Array.isArray(doc.parts)) {
    throw new Error('Component library is missing a parts array.')
  }
  const parts: LibraryPart[] = []
  const seen = new Set<string>()
  for (const [index, entry] of doc.parts.entries()) {
    if (!isLibraryPart(entry)) {
      throw new Error(`Component library parts[${index}] does not match the schema.`)
    }
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate part id "${entry.id}".`)
    }
    seen.add(entry.id)
    parts.push(entry)
  }
  return { schemaVersion: doc.schemaVersion, parts }
}

export function partById(
  library: ComponentLibrary | null,
  partId: string | undefined,
): LibraryPart | undefined {
  if (!library || !partId) return undefined
  return library.parts.find((part) => part.id === partId)
}

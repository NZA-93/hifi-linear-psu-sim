import { parseComponentLibrary } from '../library'
import { parsePresetFile } from '../presets'
import { useJsonResource } from './useJsonResource'

export function useComponentLibrary() {
  const { data, error } = useJsonResource('data/components.json', parseComponentLibrary)
  return { library: data, error }
}

export function usePresetFile() {
  const { data, error } = useJsonResource('data/presets.json', parsePresetFile)
  return { presetFile: data, error }
}

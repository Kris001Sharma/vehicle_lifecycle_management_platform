import { getSpecFields } from '@/lib/catalog/specSchemas'

interface RenderedSpec {
  group: string
  label: string
  value: string
  unit?: string
}

export function renderVariantSpecs(
  categorySlug: string,
  subcategorySlug: string | null,
  powertrainSlug: string,
  specs: Record<string, any>
): RenderedSpec[] {
  const fields = getSpecFields(
    categorySlug,
    subcategorySlug ?? '',
    powertrainSlug
  )
  return fields
    .filter(f => {
      const val = specs[f.key]
      return val !== null &&
        val !== undefined &&
        val !== ''
    })
    .map(f => {
      const val = specs[f.key]
      let display = ''
      if (f.type === 'boolean') {
        display = val ? 'Yes' : 'No'
      } else if (f.type === 'select' && f.options) {
        display = f.options.find(
          o => o.value === val
        )?.label ?? String(val)
      } else {
        display = String(val)
      }
      return {
        group: f.group,
        label: f.label,
        value: display,
        unit: f.unit,
      }
    })
}

export function groupRenderedSpecs(
  specs: RenderedSpec[]
): Record<string, RenderedSpec[]> {
  return specs.reduce((acc, spec) => {
    if (!acc[spec.group]) acc[spec.group] = []
    acc[spec.group].push(spec)
    return acc
  }, {} as Record<string, RenderedSpec[]>)
}

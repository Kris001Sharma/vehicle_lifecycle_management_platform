import { renderVariantSpecs, groupRenderedSpecs } from '@/lib/catalog/renderSpecs';

interface SpecDisplayProps {
  categorySlug: string;
  subcategorySlug: string | null;
  powertrainSlug: string;
  specs: Record<string, any>;
  compact?: boolean;
}

export function SpecDisplay({
  categorySlug,
  subcategorySlug,
  powertrainSlug,
  specs,
  compact = false
}: SpecDisplayProps) {
  if (!specs || Object.keys(specs).length === 0) return null;

  const renderedSpecs = renderVariantSpecs(categorySlug, subcategorySlug, powertrainSlug, specs);
  if (renderedSpecs.length === 0) return null;

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        {renderedSpecs.map((spec, i) => (
          <div key={`${spec.group}-${spec.label}-${i}`} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
            <span className="text-xs text-slate-500 font-medium truncate pr-2 uppercase tracking-wide">{spec.label}</span>
            <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
              {spec.value} {spec.unit && <span className="text-slate-400 text-xs ml-0.5 font-normal">{spec.unit}</span>}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const groupedSpecs = groupRenderedSpecs(renderedSpecs);

  return (
    <div className="space-y-6">
      {Object.entries(groupedSpecs).map(([group, groupSpecs]) => (
        <div key={group}>
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center">
            {group}
            <div className="flex-1 h-px bg-slate-100 ml-3"></div>
          </h4>
          <div className="grid gap-x-8 gap-y-2 grid-cols-1 md:grid-cols-2">
            {groupSpecs.map((spec, i) => (
              <div key={`${spec.label}-${i}`} className="flex justify-between py-1.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors px-1">
                <span className="text-sm text-slate-600">{spec.label}</span>
                <span className="text-sm font-medium text-slate-900">
                  {spec.value} {spec.unit && <span className="text-slate-400 font-normal text-xs">{spec.unit}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

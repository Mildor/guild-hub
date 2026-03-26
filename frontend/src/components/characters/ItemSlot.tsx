import { EquipmentItem } from '@/types/character';
import { itemQualityColors, qualityNameToId, slotNames } from '@/lib/wowData';
import { ReactNode } from 'react';

interface ItemSlotProps {
  item?: EquipmentItem;
  slotName: string;
  emptyIcon: ReactNode;
}

// Récupérer la qualité d'un item
function getQualityId(item?: EquipmentItem): number {
  if (!item?.quality) return 1;
  return qualityNameToId[item.quality.name] ?? 1;
}

// Récupérer l'icon d'un item via WoW CDN
function getItemIcon(item: EquipmentItem): string {
  return `https://render.worldofwarcraft.com/eu/item/${item.item.id}/icon.jpg`;
}

export function ItemSlot({ item, slotName, emptyIcon }: ItemSlotProps) {
  if (item) {
    const qualityId = getQualityId(item);
    const colorClass = itemQualityColors[qualityId] || 'text-white';

    return (
      <a
        href={`https://www.wowhead.com/fr/item=${item.item.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 hover:bg-slate-800 p-1 rounded-md transition-colors cursor-pointer group"
      >
        {/* Item Icon */}
        <div className="flex-shrink-0">
          <img
            src={getItemIcon(item)}
            alt={item.name}
            className="w-12 h-12 rounded border border-slate-600 group-hover:border-slate-500 transition-colors"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Item Info */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <p className={`text-sm font-semibold ${colorClass} truncate`}>
            {item.name}
          </p>
          {item.level?.value && (
            <p className="text-xs text-slate-400">ilvl {item.level.value}</p>
          )}
        </div>
      </a>
    );
  }

  // Slot vide
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-700/50 bg-slate-900/20 text-muted-foreground/50 hover:border-slate-600 hover:text-muted-foreground/70 transition-colors">
      <div className="opacity-60">{emptyIcon}</div>
      <p className="text-xs text-center font-medium opacity-60">
        {slotNames[slotName] || slotName}
      </p>
    </div>
  );
}

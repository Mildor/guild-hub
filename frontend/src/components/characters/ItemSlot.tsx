import { EquipmentItem } from '@/types/character';
import { itemQualityColors, qualityNameToId, slotNames } from '@/lib/wowData';
import api from '@/lib/api';
import { ReactNode, useState, useEffect } from 'react';

interface ItemSlotProps {
  item?: EquipmentItem;
  slotName: string;
  emptyIcon: ReactNode;
}

const FALLBACK_ICON_URL = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';

// Cache pour les icônes d'items
const iconCache: Record<number, string> = {};

// Récupérer la qualité d'un item
function getQualityId(item?: EquipmentItem): number {
  if (!item?.quality) return 1;
  return qualityNameToId[item.quality.name] ?? 1;
}

// Récupérer l'icon d'un item via le backend proxy
async function fetchItemIcon(itemId: number): Promise<string> {
  // Vérifier le cache
  if (iconCache[itemId]) {
    return iconCache[itemId];
  }

  try {
    const response = await api.get(`/items/${itemId}/icon`);

    if (response.data?.iconUrl) {
      iconCache[itemId] = response.data.iconUrl;
      return response.data.iconUrl;
    }

    throw new Error('No icon found');
  } catch (error) {
    console.error(`Failed to fetch icon for item ${itemId}:`, error);
    return FALLBACK_ICON_URL;
  }
}

function ItemSlotContent({ item, slotName, emptyIcon }: ItemSlotProps) {
  const [iconUrl, setIconUrl] = useState<string>('');
  const [loading, setLoading] = useState(Boolean(item));

  useEffect(() => {
    let cancelled = false;

    if (!item) {
      setIconUrl('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setIconUrl('');

    fetchItemIcon(item.item.id)
      .then((url) => {
        if (!cancelled) {
          setIconUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIconUrl(FALLBACK_ICON_URL);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item?.item.id]);

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
          {loading ? (
            <div className="w-12 h-12 rounded border border-slate-600 bg-slate-800 animate-pulse" />
          ) : (
            <img
              src={iconUrl}
              alt={item.name}
              className="w-12 h-12 rounded border border-slate-600 group-hover:border-slate-500 transition-colors"
              onError={(e) => {
                if (e.currentTarget.src !== FALLBACK_ICON_URL) {
                  e.currentTarget.src = FALLBACK_ICON_URL;
                }
              }}
            />
          )}
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

export function ItemSlot(props: ItemSlotProps) {
  return <ItemSlotContent {...props} />;
}

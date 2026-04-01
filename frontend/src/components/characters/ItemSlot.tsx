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
    const qualityClass = itemQualityColors[qualityId] || 'text-white';

    return (
      <a
        href={`https://www.wowhead.com/fr/item=${item.item.id}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`${slotNames[slotName] || slotName}${item.level?.value ? ` - ilvl ${item.level.value}` : ''}`}
        className="block rounded-md transition-transform duration-150 hover:scale-[1.03] cursor-pointer group"
      >
        <div className="relative w-12 h-12">
          {loading ? (
            <div className="w-12 h-12 rounded border border-border bg-muted animate-pulse" />
          ) : (
            <>
              <img
                src={iconUrl}
                alt={item.name}
                className={`w-12 h-12 rounded border ${qualityClass} group-hover:border-primary/40 transition-colors`}
                onError={(e) => {
                  if (e.currentTarget.src !== FALLBACK_ICON_URL) {
                    e.currentTarget.src = FALLBACK_ICON_URL;
                  }
                }}
              />
              {item.level?.value && (
                <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] leading-none font-semibold text-white px-1 py-0.5 rounded-sm">
                  {item.level.value}
                </span>
              )}
            </>
          )}
        </div>
      </a>
    );
  }

  // Slot vide
  return (
    <div
      title={slotNames[slotName] || slotName}
      className="w-12 h-12 flex items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/20 text-muted-foreground/45 hover:border-primary/30 transition-colors"
    >
      <div className="opacity-60 scale-75">{emptyIcon}</div>
    </div>
  );
}

export function ItemSlot(props: ItemSlotProps) {
  return <ItemSlotContent {...props} />;
}

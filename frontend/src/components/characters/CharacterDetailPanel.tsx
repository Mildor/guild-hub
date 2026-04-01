import { Character, EquipmentItem } from "@/types/character";
import { ItemSlot } from "@/components/characters/ItemSlot";
import { slotNames } from "@/lib/wowData";
import {
    Brain,
    Shirt,
    Watch,
    Gem,
    Zap,
    Swords,
    Shield,
    Wand2,
    GalleryVertical,
    Backpack,
    Wand,
} from "lucide-react";

// Mapping des slots Blizzard vers noms standard (left column, right column, bottom)
const SLOT_LAYOUT = {
    LEFT: [
        "HEAD",
        "NECK",
        "SHOULDER",
        "BACK",
        "CHEST",
        "SHIRT",
        "TABARD",
        "WRIST",
    ],
    RIGHT: [
        "HANDS",
        "WAIST",
        "LEGS",
        "FEET",
        "FINGER_1",
        "FINGER_2",
        "TRINKET_1",
        "TRINKET_2",
    ],
    BOTTOM: ["MAIN_HAND", "OFF_HAND"],
};

// Map des icones Lucide génériques pour slots vides
const SLOT_ICONS: Record<string, React.ReactNode> = {
    HEAD: <Brain className="w-6 h-6" />,
    NECK: <Watch className="w-6 h-6" />,
    SHOULDER: <Shirt className="w-6 h-6" />,
    BACK: <Backpack className="w-6 h-6" />,
    CHEST: <Shirt className="w-6 h-6" />,
    SHIRT: <Shirt className="w-6 h-6" />,
    TABARD: <Shirt className="w-6 h-6" />,
    WAIST: <Watch className="w-6 h-6" />,
    LEGS: <Shirt className="w-6 h-6" />,
    FEET: <Watch className="w-6 h-6" />,
    WRIST: <Watch className="w-6 h-6" />,
    HANDS: <Wand2 className="w-6 h-6" />,
    FINGER: <Gem className="w-6 h-6" />,
    FINGER_1: <Gem className="w-6 h-6" />,
    FINGER_2: <Gem className="w-6 h-6" />,
    TRINKET: <Zap className="w-6 h-6" />,
    TRINKET_1: <Zap className="w-6 h-6" />,
    TRINKET_2: <Zap className="w-6 h-6" />,
    MAIN_HAND: <Swords className="w-6 h-6" />,
    OFF_HAND: <Shield className="w-6 h-6" />,
    RANGED: <Wand className="w-6 h-6" />,
};

interface CharacterDetailPanelProps {
    data: Character;
}

// Récupérer un item par type de slot
function getItemBySlotType(
    slotType: string,
    items?: EquipmentItem[],
): EquipmentItem | undefined {
    if (!items) return undefined;

    // Exact match
    const exactMatch = items.find((item) => item.slot.type === slotType);
    if (exactMatch) return exactMatch;

    // Pour les slots variés (FINGER_1, FINGER_2, TRINKET_1, TRINKET_2)
    if (slotType.startsWith("FINGER_")) {
        const index = parseInt(slotType.split("_")[1]) - 1;
        const matches = items.filter(
            (item) =>
                item.slot.type === "FINGER" ||
                item.slot.type.startsWith("FINGER"),
        );
        return matches[index];
    }

    if (slotType.startsWith("TRINKET_")) {
        const index = parseInt(slotType.split("_")[1]) - 1;
        const matches = items.filter(
            (item) =>
                item.slot.type === "TRINKET" ||
                item.slot.type.startsWith("TRINKET"),
        );
        return matches[index];
    }

    return undefined;
}

export function CharacterDetailPanel({ data }: CharacterDetailPanelProps) {
    const equipment = data.equipment || [];

    // Si aucune donnée d'équipement
    if (!equipment || equipment.length === 0) {
        return (
            <div className="p-8 text-center rounded-lg bg-slate-800/20 border border-slate-700/50">
                <GalleryVertical className="w-12 h-12 opacity-30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                    Données de personnage non synchronisées. Cliquez sur
                    "Synchroniser" pour charger l'équipement.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/50 p-6">
            {/* Main Paperdoll Grid Layout */}
            <div className="grid grid-cols-3 gap-6 mb-6">
                {/* LEFT COLUMN - 8 slots */}
                <div className="flex flex-col gap-3">
                    {SLOT_LAYOUT.LEFT.map((slotType) => (
                        <ItemSlot
                            key={slotType}
                            item={getItemBySlotType(slotType, equipment)}
                            slotName={slotType}
                            emptyIcon={
                                SLOT_ICONS[slotType] || SLOT_ICONS["CHEST"]
                            }
                        />
                    ))}
                </div>

                {/* CENTER - Character Render */}
                <div className="flex flex-col items-center justify-center gap-4">
                    {data.renderUrl || data.insetUrl || data.avatarUrl ? (
                        <div className="relative rounded-lg overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 w-full h-96 group">
                            <img
                                src={
                                    data.renderUrl ||
                                    data.insetUrl ||
                                    data.avatarUrl
                                }
                                alt={data.name}
                                className={`w-full h-full ${data.renderUrl ? "object-contain" : "object-cover"} group-hover:scale-105 transition-transform duration-300`}
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                            {/* Badge spécialisation */}
                            {data.activeSpecIcon && data.activeSpecName && (
                                <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-600">
                                    <img
                                        src={`https://render.worldofwarcraft.com/eu/spell/${data.activeSpecIcon}.jpg`}
                                        alt={data.activeSpecName}
                                        className="w-5 h-5 rounded"
                                    />
                                    <span className="text-xs font-semibold text-white">
                                        {data.activeSpecName}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full h-96 rounded-lg bg-slate-800 border border-slate-700 text-muted-foreground overflow-hidden">
                            <GalleryVertical className="w-12 h-12 opacity-30" />
                        </div>
                    )}

                    {/* Talents Section */}
                    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 w-full text-center">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Talents
                        </p>
                        <div className="text-xs text-muted-foreground/60">
                            Bientôt disponible
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - 8 slots */}
                <div className="flex flex-col gap-3">
                    {SLOT_LAYOUT.RIGHT.map((slotType) => (
                        <ItemSlot
                            key={slotType}
                            item={getItemBySlotType(slotType, equipment)}
                            slotName={slotType}
                            emptyIcon={
                                SLOT_ICONS[slotType] || SLOT_ICONS["CHEST"]
                            }
                        />
                    ))}
                </div>
            </div>

            {/* BOTTOM ROW - Weapons (centered) */}
            <div className="border-t border-slate-700/50 pt-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">
                    Armes
                </p>
                <div className="flex justify-center gap-6 max-w-md mx-auto">
                    {SLOT_LAYOUT.BOTTOM.map((slotType) => (
                        <div key={slotType} className="flex-1">
                            <ItemSlot
                                item={getItemBySlotType(slotType, equipment)}
                                slotName={slotType}
                                emptyIcon={
                                    SLOT_ICONS[slotType] ||
                                    SLOT_ICONS["MAIN_HAND"]
                                }
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

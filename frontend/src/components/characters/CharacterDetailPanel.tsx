import { Character, EquipmentItem } from "@/types/character";
import { ItemSlot } from "@/components/characters/ItemSlot";
import { slotNames } from "@/lib/wowData";
import { formatForUrl } from "@/lib/utils";
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
    ExternalLink,
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

const ARCHON_CLASS_MAP: Record<string, string> = {
    warrior: "warrior",
    guerrier: "warrior",
    paladin: "paladin",
    hunter: "hunter",
    chasseur: "hunter",
    rogue: "rogue",
    voleur: "rogue",
    priest: "priest",
    pretre: "priest",
    "chevalier-de-la-mort": "death-knight",
    deathknight: "death-knight",
    "death-knight": "death-knight",
    shaman: "shaman",
    chamane: "shaman",
    mage: "mage",
    warlock: "warlock",
    demoniste: "warlock",
    monk: "monk",
    moine: "monk",
    druid: "druid",
    druide: "druid",
    demonhunter: "demon-hunter",
    "demon-hunter": "demon-hunter",
    "chasseur-de-demons": "demon-hunter",
    evoker: "evoker",
    "evoqueur": "evoker",
};

const ARCHON_SPEC_MAP: Record<string, string> = {
    // Warrior
    armes: "arms",
    fury: "fury",
    fureur: "fury",
    protection: "protection",
    // Paladin
    sacre: "holy",
    vindicte: "retribution",
    retribution: "retribution",
    // Hunter
    "maitrise-des-betes": "beast-mastery",
    "precision": "marksmanship",
    survie: "survival",
    // Rogue
    assassinat: "assassination",
    horslaloi: "outlaw",
    "hors-la-loi": "outlaw",
    subtilite: "subtlety",
    // Priest
    discipline: "discipline",
    ombre: "shadow",
    // Death Knight
    sang: "blood",
    givre: "frost",
    impie: "unholy",
    // Shaman
    elementaire: "elemental",
    amelioration: "enhancement",
    restauration: "restoration",
    // Mage
    arcane: "arcane",
    feu: "fire",
    // Warlock
    affliction: "affliction",
    demonologie: "demonology",
    destruction: "destruction",
    // Monk
    "maitre-brasseur": "brewmaster",
    "marche-vent": "windwalker",
    tissebrume: "mistweaver",
    // Druid
    equilibre: "balance",
    farouche: "feral",
    gardien: "guardian",
    // Demon Hunter
    devastation: "havoc",
    vengeance: "vengeance",
    // Evoker
    preservation: "preservation",
    augmentation: "augmentation",
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
    const formattedRealm = formatForUrl(data.realm);
    const formattedName = formatForUrl(data.name);
    const rawSpec = formatForUrl(data.activeSpecName || data.activeSpec);
    const archonSpec = ARCHON_SPEC_MAP[rawSpec] || rawSpec;
    const archonClass =
        ARCHON_CLASS_MAP[formatForUrl(data.class)] || formatForUrl(data.class);

    const quickLinks = [
        {
            label: "Armurerie",
            href: `https://worldofwarcraft.blizzard.com/fr-fr/character/eu/${formattedRealm}/${formattedName}`,
        },
        {
            label: "Warcraft Logs",
            href: `https://www.warcraftlogs.com/character/eu/${formattedRealm}/${formattedName}`,
        },
        {
            label: "Raider.IO",
            href: `https://raider.io/characters/eu/${formattedRealm}/${formattedName}`,
        },
        {
            label: "Archon M+",
            href: `https://www.archon.gg/wow/builds/${archonSpec}/${archonClass}/mythic-plus/overview/10/all-dungeons/this-week`,
        },
        {
            label: "Archon Raid",
            href: `https://www.archon.gg/wow/builds/${archonSpec}/${archonClass}/raid/overview/mythic/all-bosses`,
        },
    ];

    // Si aucune donnée d'équipement
    if (!equipment || equipment.length === 0) {
        return (
            <div className="p-8 text-center rounded-lg bg-muted/30 border border-border/50">
                <GalleryVertical className="w-12 h-12 opacity-30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                    Données de personnage non synchronisées. Cliquez sur
                    "Synchroniser" pour charger l'équipement.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg overflow-hidden bg-gradient-to-b from-card to-background border border-border/50 p-6">
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
                        <div className="relative rounded-lg overflow-hidden bg-gradient-to-b from-muted to-card border border-border w-full h-96 group">
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
                                <div className="absolute top-3 right-3 flex items-center gap-2 glass px-3 py-1.5 rounded-lg">
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
                        <div className="flex items-center justify-center w-full h-96 rounded-lg bg-muted border border-border text-muted-foreground overflow-hidden">
                            <GalleryVertical className="w-12 h-12 opacity-30" />
                        </div>
                    )}

                    <div className="flex flex-wrap justify-center gap-3 mt-1 w-full">
                        {quickLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors flex items-center gap-2"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{link.label}</span>
                            </a>
                        ))}
                    </div>

                    {/* Talents Section */}
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 w-full text-center">
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
            <div className="border-t border-border/50 pt-6">
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

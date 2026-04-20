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
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Mapping des slots Blizzard vers noms standard (left column, right column, bottom)
const SLOT_LAYOUT = {
    LEFT: ["HEAD", "NECK", "SHOULDER", "BACK", "CHEST", "WRIST"],
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
    evoqueur: "evoker",
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
    precision: "marksmanship",
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
    onSyncCharacter?: () => void;
    isSyncing?: boolean;
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

export function CharacterDetailPanel({
    data,
    onSyncCharacter,
    isSyncing = false,
}: CharacterDetailPanelProps) {
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

    const allArmorSlots = [
        ...SLOT_LAYOUT.LEFT,
        ...SLOT_LAYOUT.RIGHT,
        ...SLOT_LAYOUT.BOTTOM,
    ];
    const renderSlot = (slotType: string) => (
        <ItemSlot
            key={slotType}
            item={getItemBySlotType(slotType, equipment)}
            slotName={slotType}
            emptyIcon={SLOT_ICONS[slotType] || SLOT_ICONS["CHEST"]}
        />
    );
    const aubergeBackground = "/uploads/auberge.png?v=20260401-1";

    // Si aucune donnée d'équipement
    if (!equipment || equipment.length === 0) {
        return (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-5 text-center md:p-8">
                <GalleryVertical className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-muted-foreground">
                    Données de personnage non synchronisées. Cliquez sur
                    "Synchroniser" pour charger l'équipement.
                </p>
                {onSyncCharacter ? (
                    <Button
                        type="button"
                        onClick={onSyncCharacter}
                        disabled={isSyncing}
                        className="mt-4 inline-flex items-center gap-2"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                        />
                        {isSyncing
                            ? "Synchronisation..."
                            : "Synchroniser ce personnage"}
                    </Button>
                ) : null}
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-slate-950/45 via-slate-900/20 to-background p-4 md:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.1),transparent_40%),linear-gradient(to_bottom,rgba(15,23,42,0.08),rgba(15,23,42,0.35))]" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
                <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold text-foreground">
                        {data.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {data.class}
                        {data.activeSpecName ? ` • ${data.activeSpecName}` : ""}
                        {data.realm ? ` • ${data.realm}` : ""}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {onSyncCharacter ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onSyncCharacter}
                            disabled={isSyncing}
                            className="h-8 rounded-full border-sky-500/30 bg-sky-500/10 px-3 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20"
                        >
                            <RefreshCw
                                className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                            />
                            {isSyncing ? "Synchronisation..." : "Synchroniser"}
                        </Button>
                    ) : null}
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-200">
                        iLvl {Math.round(data.ilvl)}
                    </span>
                    {data.activeSpecName && (
                        <span className="rounded-full border border-border/70 bg-card/60 px-2.5 py-1 font-medium text-muted-foreground">
                            {data.activeSpecName}
                        </span>
                    )}
                </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Liens utiles
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
                    {quickLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border/80 bg-background/70 px-3 py-2 text-xs font-medium text-foreground/90 transition-colors hover:border-sky-400/40 hover:bg-sky-500/10 sm:w-auto"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>{link.label}</span>
                        </a>
                    ))}
                </div>
            </div>
            <div className="relative mt-4 grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-start">
                <div className="hidden xl:flex xl:flex-col xl:gap-2">
                    {SLOT_LAYOUT.LEFT.map(renderSlot)}
                    <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
                        {renderSlot("MAIN_HAND")}
                        {renderSlot("OFF_HAND")}
                    </div>
                </div>

                <div className="space-y-4">
                    {data.renderUrl || data.insetUrl || data.avatarUrl ? (
                        <div className="relative isolate overflow-hidden rounded-xl border border-border/60 bg-slate-950/45 p-2">
                            <div className="pointer-events-none absolute inset-0 flex items-end">
                                <img
                                    src={aubergeBackground}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-full w-full object-cover object-bottom"
                                />
                            </div>
                            <div className="relative h-[280px] sm:h-[360px] md:h-[420px]">
                                <img
                                    src={
                                        data.renderUrl ||
                                        data.insetUrl ||
                                        data.avatarUrl
                                    }
                                    alt={data.name}
                                    className={`relative z-10 h-full w-full rounded-lg drop-shadow-2xl ${data.renderUrl ? "object-contain" : "object-scale-down"}`}
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />
                            </div>
                            {data.activeSpecIcon && data.activeSpecName && (
                                <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-border/70 bg-black/50 px-3 py-1.5 backdrop-blur">
                                    <img
                                        src={`https://render.worldofwarcraft.com/eu/spell/${data.activeSpecIcon}.jpg`}
                                        alt={data.activeSpecName}
                                        className="h-5 w-5 rounded"
                                    />
                                    <span className="text-xs font-semibold text-slate-100">
                                        {data.activeSpecName}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-[320px] sm:h-[420px] w-full items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 text-muted-foreground">
                            <GalleryVertical className="h-12 w-12 opacity-30" />
                        </div>
                    )}
                </div>

                <div className="hidden xl:flex xl:flex-col xl:gap-2">
                    {SLOT_LAYOUT.RIGHT.map(renderSlot)}
                </div>

                <div className="xl:hidden rounded-xl border border-border/60 bg-card/30 p-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Équipement
                    </p>
                    <div className="grid grid-cols-2 place-items-center gap-4 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-8">
                        {allArmorSlots.map((slotType) => (
                            <div key={slotType} className="flex justify-center">
                                {renderSlot(slotType)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

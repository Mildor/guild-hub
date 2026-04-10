export enum WoWClass {
    WARRIOR = "Warrior",
    PALADIN = "Paladin",
    HUNTER = "Hunter",
    ROGUE = "Rogue",
    PRIEST = "Priest",
    DEATH_KNIGHT = "DeathKnight",
    SHAMAN = "Shaman",
    MAGE = "Mage",
    WARLOCK = "Warlock",
    MONK = "Monk",
    DRUID = "Druid",
    DEMON_HUNTER = "DemonHunter",
    EVOKER = "Evoker",
}

export enum GameRole {
    TANK = "TANK",
    HEALER = "HEALER",
    DPS = "DPS",
}

export interface EquipmentItem {
    slot: {
        type: string;
        name: string;
    };
    item: {
        id: number;
    };
    name: string; // Nom de l'item
    level?: {
        value: number;
    };
    quality?: {
        type: string;
        name: string;
    };
    armor?: {
        value: number;
    };
    media?: {
        key: { href: string };
    };
    set?: {
        item_set: {
            name: string;
        };
    };
    iconUrl?: string;
}

export interface Character {
    id: string;
    userId: string;
    name: string;
    realm: string;
    class: string;
    activeSpec: string;
    gameRole: GameRole;
    ilvl: number;
    isMain: boolean;
    inRoster: boolean;
    sharedProfile?: 'A' | 'B' | 'C' | null;
    guildRank?: number | null;
    lastSyncAt: string;

    // Media
    avatarUrl?: string;
    renderUrl?: string;
    insetUrl?: string;

    // Spécialisation
    activeSpecName?: string;
    activeSpecIcon?: string;

    // Équipement
    equipment?: EquipmentItem[] | null;
}

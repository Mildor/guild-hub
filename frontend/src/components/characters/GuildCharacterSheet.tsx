import { Character, EquipmentItem } from "@/types/character";
import { ItemSlot } from "@/components/characters/ItemSlot";
import { formatForUrl } from "@/lib/utils";
import { getClassColorStyle } from "@/lib/wowColors";
import { WowIcon } from "@/components/ui/WowIcon";
import { classIcons } from "@/lib/wowData";
import {
  Brain, Shirt, Watch, Gem, Zap, Swords, Shield, Wand2, Backpack, Wand, ExternalLink, RefreshCw, AlertCircle, FileText, Trophy
} from "lucide-react";
import { useState, useMemo } from 'react';
import { type CharacterWithUser, useSyncCharacterWcl, useGetRaiderIoProfile, useSyncCharacter } from "@/api/queries";
import { useAuthStore } from "@/store/authStore";

const MPLUS_ENCOUNTERS: Record<number, string> = {
  112526: "Algeth'ar Academy",
  12811: "Magisters' Terrace",
  12874: "Maisara Caverns",
  12915: "Nexus-Point Xenas",
  10658: "Pit of Saron",
  361753: "Seat of the Triumvirate",
  61209: "Skyreach",
  12805: "Windrunner Spire",
};

const RAID_ENCOUNTERS: Record<number, string> = {
  // Zone 44 (Manaforge Omega)
  3129: "Plexus Sentinel",
  3131: "Loom'ithar",
  3130: "Soulbinder Naazindhri",
  3132: "Forgeweaver Araz",
  3122: "The Soul Hunters",
  3133: "Fractillus",
  3134: "Nexus-King Salhadaar",
  3135: "Dimensius, the All-Devouring",

  // Zone 46 (VS / DR / MQD)
  3176: "Imperator Averzian",
  3177: "Vorasius",
  3179: "Fallen-King Salhadaar",
  3178: "Vaelgor & Ezzorak",
  3180: "Lightblinded Vanguard",
  3181: "Crown of the Cosmos",
  3306: "Chimaerus, the Undreamt God",
  3182: "Belo'ren, Child of Al'ar",
  3183: "Midnight Falls",
};

const WCL_CLASSES: Record<string, string> = {
  'Guerrier': 'Warrior',
  'Paladin': 'Paladin',
  'Chasseur': 'Hunter',
  'Voleur': 'Rogue',
  'Prêtre': 'Priest',
  'Chevalier de la mort': 'DeathKnight',
  'Chaman': 'Shaman',
  'Mage': 'Mage',
  'Démoniste': 'Warlock',
  'Moine': 'Monk',
  'Druide': 'Druid',
  'Chasseur de démons': 'DemonHunter',
  'Évocateur': 'Evoker',
};

const WCL_SPECS: Record<string, string> = {
  'Sang': 'Blood', 'Givre': 'Frost', 'Impie': 'Unholy',
  'Dévastation': 'Havoc', 'Vengeance': 'Vengeance',
  'Équilibre': 'Balance', 'Farouche': 'Feral', 'Gardien': 'Guardian', 'Restauration': 'Restoration',
  'Préservation': 'Preservation', 'Augmentation': 'Augmentation',
  'Maîtrise des bêtes': 'BeastMastery', 'Précision': 'Marksmanship', 'Survie': 'Survival',
  'Arcanes': 'Arcane', 'Feu': 'Fire',
  'Maître brasseur': 'Brewmaster', 'Tisse-brume': 'Mistweaver', 'Marche-vent': 'Windwalker',
  'Sacré': 'Holy', 'Protection': 'Protection', 'Vindicte': 'Retribution',
  'Discipline': 'Discipline', 'Ombre': 'Shadow',
  'Assassinat': 'Assassination', 'Hors-la-loi': 'Outlaw', 'Finesse': 'Subtlety',
  'Élémentaire': 'Elemental', 'Amélioration': 'Enhancement',
  'Affliction': 'Affliction', 'Démonologie': 'Demonology', 'Destruction': 'Destruction',
  'Armes': 'Arms', 'Fureur': 'Fury',
};

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

const getRankBadgeStyle = (rank: number) => {
  if (rank <= 5) {
    return "bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 border-amber-500/40 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]";
  } else if (rank <= 25) {
    return "bg-gradient-to-r from-slate-400/20 to-slate-200/10 text-slate-300 border-slate-400/40 font-semibold";
  } else if (rank <= 50) {
    return "bg-gradient-to-r from-amber-700/25 to-amber-900/10 text-amber-500 border-amber-700/40";
  }
  return "bg-zinc-800/60 text-zinc-400 border-zinc-700/40";
};

const getKeyLevelColor = (level: number) => {
  if (level >= 15) return "text-purple-400 bg-purple-500/10 border-purple-500/30";
  if (level >= 10) return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  if (level >= 5) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  return "text-slate-400 bg-slate-500/10 border-slate-500/30";
};

const getParseColor = (parse: number) => {
  if (parse >= 99) return "text-[#e268a8]"; // Pink
  if (parse >= 95) return "text-[#ff8000]"; // Orange
  if (parse >= 75) return "text-[#a335ee]"; // Purple
  if (parse >= 50) return "text-[#0070dd]"; // Blue
  if (parse >= 25) return "text-[#1eff00]"; // Green
  return "text-[#666666]"; // Gray
};

const formatLogDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

interface DungeonInfo {
  name: string;
  image: string;
  gradient: string;
  textColor: string;
}

const DUNGEON_DETAILS: Record<number, DungeonInfo> = {
  112526: {
    name: "Algeth'ar Academy",
    image: "https://wow.zamimg.com/images/wow/icons/medium/achievement_dungeon_dragonacademy.jpg",
    gradient: "from-amber-600/50 via-amber-950/80 to-zinc-950",
    textColor: "text-amber-400"
  },
  12811: {
    name: "Magisters' Terrace",
    image: "https://wow.zamimg.com/images/wow/icons/medium/inv_achievement_dungeon_magistersterrace.jpg",
    gradient: "from-red-600/50 via-red-950/80 to-zinc-950",
    textColor: "text-red-400"
  },
  12874: {
    name: "Maisara Caverns",
    image: "https://wow.zamimg.com/images/wow/icons/medium/inv_achievement_dungeon_maisarahills.jpg",
    gradient: "from-blue-600/50 via-blue-950/80 to-zinc-950",
    textColor: "text-blue-400"
  },
  12915: {
    name: "Nexus-Point Xenas",
    image: "https://wow.zamimg.com/images/wow/icons/medium/inv_achievement_dungeon_nexuspointxenas.jpg",
    gradient: "from-cyan-600/50 via-cyan-950/80 to-zinc-950",
    textColor: "text-cyan-400"
  },
  10658: {
    name: "Pit of Saron",
    image: "https://wow.zamimg.com/images/wow/icons/medium/achievement_dungeon_icecrown_pitofsaron.jpg",
    gradient: "from-slate-600/50 via-slate-950/80 to-zinc-950",
    textColor: "text-slate-400"
  },
  361753: {
    name: "Seat of the Triumvirate",
    image: "https://wow.zamimg.com/images/wow/icons/medium/achievement_dungeon_argusdungeon.jpg",
    gradient: "from-purple-600/50 via-purple-950/80 to-zinc-950",
    textColor: "text-purple-400"
  },
  61209: {
    name: "Skyreach",
    image: "https://wow.zamimg.com/images/wow/icons/medium/achievement_dungeon_arakkoaspires.jpg",
    gradient: "from-yellow-600/50 via-yellow-950/80 to-zinc-950",
    textColor: "text-yellow-400"
  },
  12805: {
    name: "Windrunner Spire",
    image: "https://wow.zamimg.com/images/wow/icons/medium/inv_achievement_dungeon_windrunnerspire.jpg",
    gradient: "from-teal-600/50 via-teal-950/80 to-zinc-950",
    textColor: "text-teal-400"
  },
};

const RAID_DETAILS: Record<number, DungeonInfo> = {
  3129: {
    name: "Plexus Sentinel",
    image: "https://wow.zamimg.com/images/wow/icons/large/inv_gizmo_02.jpg",
    gradient: "from-indigo-600/50 via-indigo-950/80 to-zinc-950",
    textColor: "text-indigo-400"
  },
  3131: {
    name: "Loom'ithar",
    image: "https://wow.zamimg.com/images/wow/icons/large/inv_elemental_primal_mana.jpg",
    gradient: "from-cyan-600/50 via-cyan-950/80 to-zinc-950",
    textColor: "text-cyan-400"
  },
  3130: {
    name: "Soulbinder Naazindhri",
    image: "https://wow.zamimg.com/images/wow/icons/large/inv_misc_soulstone.jpg",
    gradient: "from-purple-600/50 via-purple-950/80 to-zinc-950",
    textColor: "text-purple-400"
  },
  3132: {
    name: "Forgeweaver Araz",
    image: "https://wow.zamimg.com/images/wow/icons/large/inv_fabric_void.jpg",
    gradient: "from-violet-600/50 via-violet-950/80 to-zinc-950",
    textColor: "text-violet-400"
  },
  3122: {
    name: "The Soul Hunters",
    image: "https://wow.zamimg.com/images/wow/icons/large/inv_misc_soulcore.jpg",
    gradient: "from-fuchsia-600/50 via-fuchsia-950/80 to-zinc-950",
    textColor: "text-fuchsia-400"
  },
  3133: {
    name: "Fractillus",
    image: "https://wow.zamimg.com/images/wow/icons/large/inv_crystal_shard.jpg",
    gradient: "from-pink-600/50 via-pink-950/80 to-zinc-950",
    textColor: "text-pink-400"
  },
  3134: {
    name: "Nexus-King Salhadaar",
    image: "https://wow.zamimg.com/images/wow/icons/large/inv_helm_cloth_salhadaar_d_01.jpg",
    gradient: "from-blue-600/50 via-blue-950/80 to-zinc-950",
    textColor: "text-blue-400"
  },
  3135: {
    name: "Dimensius, the All-Devouring",
    image: "https://wow.zamimg.com/images/wow/icons/large/inv_misc_shadowgolem.jpg",
    gradient: "from-emerald-600/50 via-emerald-950/80 to-zinc-950",
    textColor: "text-emerald-400"
  },
  3176: {
    name: "Imperator Averzian",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-host-general.png",
    gradient: "from-red-600/50 via-red-950/80 to-zinc-950",
    textColor: "text-red-400"
  },
  3177: {
    name: "Vorasius",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-kaiju.png",
    gradient: "from-blue-600/50 via-blue-950/80 to-zinc-950",
    textColor: "text-blue-400"
  },
  3179: {
    name: "Fallen-King Salhadaar",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-salhadaar.png",
    gradient: "from-amber-600/50 via-amber-950/80 to-zinc-950",
    textColor: "text-amber-400"
  },
  3178: {
    name: "Vaelgor & Ezzorak",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-dragon-duo.png",
    gradient: "from-indigo-600/50 via-indigo-950/80 to-zinc-950",
    textColor: "text-indigo-400"
  },
  3180: {
    name: "Lightblinded Vanguard",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-paladin-trio.png",
    gradient: "from-cyan-600/50 via-cyan-950/80 to-zinc-950",
    textColor: "text-cyan-400"
  },
  3181: {
    name: "Crown of the Cosmos",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-alleria.png",
    gradient: "from-purple-600/50 via-purple-950/80 to-zinc-950",
    textColor: "text-purple-400"
  },
  3306: {
    name: "Chimaerus, the Undreamt God",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-malformed-manifestation.png",
    gradient: "from-violet-600/50 via-violet-950/80 to-zinc-950",
    textColor: "text-violet-400"
  },
  3182: {
    name: "Belo'ren, Child of Al'ar",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-light-void-phoenix.png",
    gradient: "from-orange-600/50 via-orange-950/80 to-zinc-950",
    textColor: "text-orange-400"
  },
  3183: {
    name: "Midnight Falls",
    image: "https://wow.zamimg.com/images/wow/journal/ui-ej-boss-lura-midnight.png",
    gradient: "from-teal-600/50 via-teal-950/80 to-zinc-950",
    textColor: "text-teal-400"
  },
};

const getParseColorHex = (parse: number) => {
  if (parse >= 99) return "#e268a8"; // Pink
  if (parse >= 95) return "#ff8000"; // Orange
  if (parse >= 75) return "#a335ee"; // Purple
  if (parse >= 50) return "#0070dd"; // Blue
  if (parse >= 25) return "#1eff00"; // Green
  return "#666666"; // Gray
};

function getItemBySlotType(
  slotType: string,
  items?: EquipmentItem[],
): EquipmentItem | undefined {
  if (!items) return undefined;

  const exactMatch = items.find((item) => item.slot.type === slotType);
  if (exactMatch) return exactMatch;

  if (slotType.startsWith("FINGER_")) {
    const parts = slotType.split("_");
    const index = parseInt(parts[1] || "0", 10) - 1;
    const matches = items.filter(
      (item) =>
        item.slot.type === "FINGER" ||
        item.slot.type.startsWith("FINGER"),
    );
    return matches[index];
  }

  if (slotType.startsWith("TRINKET_")) {
    const parts = slotType.split("_");
    const index = parseInt(parts[1] || "0", 10) - 1;
    const matches = items.filter(
      (item) =>
        item.slot.type === "TRINKET" ||
        item.slot.type.startsWith("TRINKET"),
    );
    return matches[index];
  }

  return undefined;
}

export function GuildCharacterSheet({ data }: { data: CharacterWithUser | Character }) {
  const user = useAuthStore((s) => s.user);
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'sheet' | 'parses'>('sheet');
  const [activeTab, setActiveTab] = useState<'mplus' | 'raid'>('mplus');
  const [regionView, setRegionView] = useState<'global' | 'eu'>('global');
  const [raidDifficultyView, setRaidDifficultyView] = useState<4 | 5>(5); // Default to Mythic (5)
  const [modalMetric, setModalMetric] = useState<'hps' | 'dps'>(
    data.gameRole === 'HEALER' ? 'hps' : 'dps'
  );

  const { mutateAsync: syncCharacterWcl } = useSyncCharacterWcl();
  const { mutateAsync: syncCharacterArmory } = useSyncCharacter(user?.userId);
  const { data: rioProfile } = useGetRaiderIoProfile(data.id);

  const rioScore = rioProfile?.mythic_plus_scores_by_season?.[0]?.scores?.all || 0;

  const hasPerformances = data.wclPerformances && data.wclPerformances.length > 0;

  const filteredPerformances = useMemo(() => {
    if (!data.wclPerformances) return [];
    return data.wclPerformances.filter((perf) => {
      const isRaidPerf = RAID_ENCOUNTERS[perf.encounterId] !== undefined;
      if (activeTab === 'raid') {
        if (!isRaidPerf) return false;
        if (perf.keyLevel !== raidDifficultyView) return false;
        const expectedMetric = data.gameRole === 'HEALER' ? modalMetric : 'dps';
        return (perf.metric || 'dps') === expectedMetric;
      } else {
        if (isRaidPerf) return false;
        if (regionView === 'eu') {
          return perf.rankRegion !== null && perf.rankRegion !== undefined && perf.rankRegion > 0;
        }
        return perf.bestRank !== null && perf.bestRank !== undefined && perf.bestRank > 0;
      }
    });
  }, [data.wclPerformances, activeTab, regionView, raidDifficultyView, modalMetric, data.gameRole]);

  const bestRaidPerformances = useMemo(() => {
    if (!data.wclPerformances) return [];
    const raidPerfs = data.wclPerformances.filter((perf) => {
      const isRaidPerf = RAID_ENCOUNTERS[perf.encounterId] !== undefined;
      if (!isRaidPerf) return false;
      if (perf.keyLevel !== raidDifficultyView) return false;
      const expectedMetric = data.gameRole === 'HEALER' ? modalMetric : 'dps';
      return (perf.metric || 'dps') === expectedMetric;
    });

    const groups: Record<number, typeof raidPerfs[number]> = {};
    raidPerfs.forEach((perf) => {
      const existing = groups[perf.encounterId];
      if (!existing || (perf.parsePercent || 0) > (existing.parsePercent || 0)) {
        groups[perf.encounterId] = perf;
      }
    });

    return Object.values(groups);
  }, [data.wclPerformances, raidDifficultyView, modalMetric, data.gameRole]);

  const averageRaidParse = useMemo(() => {
    if (bestRaidPerformances.length === 0) return 0;
    const sum = bestRaidPerformances.reduce((acc, perf) => acc + (perf.parsePercent || 0), 0);
    return sum / bestRaidPerformances.length;
  }, [bestRaidPerformances]);

  const getRaidSummary = () => {
    if (!rioProfile?.raid_progression) return null;
    for (const slug of ["liberation-of-undermine", "nerubar-palace"]) {
      if (rioProfile.raid_progression[slug]?.summary) {
        return rioProfile.raid_progression[slug].summary;
      }
    }
    return Object.values(rioProfile.raid_progression)[0]?.summary || null;
  };

  const raidSummary = getRaidSummary();

  const equipment = data.equipment || [];

  const leftSlots = ["HEAD", "NECK", "SHOULDER", "BACK", "CHEST", "WRIST"];
  const rightSlots = ["HANDS", "WAIST", "LEGS", "FEET", "FINGER_1", "FINGER_2", "TRINKET_1", "TRINKET_2"];
  const bottomSlots = ["MAIN_HAND", "OFF_HAND"];

  const formattedRealm = formatForUrl(data.realm || '');
  const formattedName = formatForUrl(data.name || '');
  const classColorInfo = getClassColorStyle(data.class || '');

  return (
    <div className="relative w-full h-full overflow-hidden bg-transparent flex flex-col min-h-0">
      {/* Background Image Blurred */}
      <div
        className="absolute inset-0 z-0 opacity-30 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: data.renderUrl ? `url(${data.renderUrl})` : 'none',
          filter: 'blur(40px) brightness(0.6)',
          transform: 'scale(1.1)'
        }}
      />

      {/* Classe Color Overlay */}
      <div
        className="absolute inset-0 z-0 opacity-15"
        style={{
          ...classColorInfo,
          background: `radial-gradient(circle at 50% 40%, currentColor 0%, transparent 60%)`
        }}
      />

      {/* Grid Pattern overlay for tech/wow UI feel */}
      <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 mix-blend-overlay" />

      <div className="relative z-10 flex flex-col h-full p-4 sm:p-6 md:p-8 flex-1 min-h-0 overflow-y-auto scrollbar-guild">

        {/* Header / Info Bar */}
        <div className="flex flex-col items-center justify-center mb-4 md:mb-6 flex-shrink-0">
          <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl px-6 py-4 flex flex-col items-center gap-3 shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full">
            <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-between w-full border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <WowIcon name={classIcons[data.class] || 'inv_misc_questionmark'} size={32} className="rounded-lg shadow-md border border-white/20" />
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={classColorInfo}>
                  {data.name}
                </h2>
              </div>

              {/* View Mode Toggle Switch */}
              <div className="flex bg-black/60 border border-white/10 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => setViewMode('sheet')}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer ${viewMode === 'sheet'
                      ? 'text-black shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  style={viewMode === 'sheet' ? { backgroundColor: classColorInfo.color || 'var(--color-primary)' } : undefined}
                >
                  Fiche
                </button>
                <button
                  onClick={() => setViewMode('parses')}
                  className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer ${viewMode === 'parses'
                      ? 'text-black shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  style={viewMode === 'parses' ? { backgroundColor: classColorInfo.color || 'var(--color-primary)' } : undefined}
                >
                  Parses
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 w-full pt-1">
              <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-white/10 shadow-inner">
                <span className="text-xs uppercase font-bold text-gray-400">iLvl</span>
                <span className="text-base font-black text-amber-400">{Math.round(data.ilvl)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-white/10 shadow-inner">
                <span className="text-xs uppercase font-bold text-gray-400">Spé</span>
                <span className="text-sm font-bold text-white">{data.activeSpecName || data.activeSpec}</span>
              </div>
              {('user' in data && data.user?.battletag) && (
                <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-white/10 shadow-inner">
                  <span className="text-sm font-bold text-blue-400">{data.user.battletag}</span>
                </div>
              )}
              {rioScore > 0 && (
                <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-amber-500/30 shadow-inner">
                  <span className="text-xs uppercase font-bold text-amber-500/70">M+ Score</span>
                  <span className="text-sm font-bold text-amber-400">{Math.round(rioScore)}</span>
                </div>
              )}
              {raidSummary && (
                <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-violet-500/30 shadow-inner">
                  <span className="text-xs uppercase font-bold text-violet-400/70">Progress</span>
                  <span className="text-sm font-bold text-violet-300">{raidSummary}</span>
                </div>
              )}

              <div className="flex items-center gap-2 md:ml-2">
                <a
                  href={`https://raider.io/characters/eu/${formattedRealm}/${formattedName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-black/40 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 hover:border-white/40 backdrop-blur-sm rounded-full px-3 py-1 transition-colors text-xs font-bold"
                >
                  Raider.IO <ExternalLink className="ml-1.5 w-3 h-3" />
                </a>
                <a
                  href={`https://www.warcraftlogs.com/character/eu/${formattedRealm}/${formattedName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-black/40 hover:bg-black/80 text-white/80 hover:text-white border border-white/20 hover:border-white/40 backdrop-blur-sm rounded-full px-3 py-1 transition-colors text-xs font-bold"
                >
                  WCL <ExternalLink className="ml-1.5 w-3 h-3" />
                </a>
                <button
                  onClick={async () => {
                    setSyncing(true);
                    try {
                      await Promise.allSettled([
                        syncCharacterWcl(data.id),
                        syncCharacterArmory(data.id)
                      ]);
                    } finally {
                      setSyncing(false);
                    }
                  }}
                  disabled={syncing}
                  className="flex items-center justify-center bg-primary/20 hover:bg-primary/40 text-primary hover:text-primary border border-primary/30 backdrop-blur-sm rounded-full px-3 py-1 transition-colors text-xs font-bold disabled:opacity-50"
                  title="Synchroniser le personnage (WCL et Armurerie)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span className="ml-1.5 hidden sm:inline">Sync Globale</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Conditional Content */}
        {viewMode === 'sheet' ? (
          /* Main Content: Character Render & Equipment */
          <div className="flex-shrink-0 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-16 relative w-full max-w-6xl mx-auto py-2">

            {/* Left Equipment Column */}
            <div className="flex flex-row md:flex-col gap-2 md:gap-3 flex-wrap justify-center order-2 md:order-1 z-20">
              {leftSlots.map(slotName => (
                <ItemSlot
                  key={slotName}
                  slotName={slotName}
                  item={getItemBySlotType(slotName, equipment)}
                  emptyIcon={SLOT_ICONS[slotName]}
                />
              ))}

              {/* Separator for Weapons */}
              <div className="hidden md:block w-8 h-px bg-white/20 mx-auto my-1 rounded-full" />
              <div className="md:hidden h-8 w-px bg-white/20 my-auto mx-1 rounded-full" />

              {bottomSlots.map(slotName => (
                <ItemSlot
                  key={slotName}
                  slotName={slotName}
                  item={getItemBySlotType(slotName, equipment)}
                  emptyIcon={SLOT_ICONS[slotName]}
                />
              ))}
            </div>

            {/* Center Character Render */}
            <div className="order-1 md:order-2 flex-1 flex flex-col items-center justify-center min-h-[300px] relative z-10 w-full max-w-[500px]">
              {data.renderUrl || data.insetUrl || data.avatarUrl ? (
                <div className="relative w-full h-full min-h-[300px] flex items-center justify-center mt-8 md:mt-0">
                  {/* Class colored portal background */}
                  <div 
                    className="absolute w-[220px] h-[220px] rounded-full filter blur-[70px] opacity-25 animate-glow-pulse pointer-events-none"
                    style={{ backgroundColor: classColorInfo.color || 'var(--color-primary)' }}
                  />
                  <img
                    src={data.renderUrl || data.insetUrl || data.avatarUrl || ''}
                    alt={data.name}
                    className={`object-contain w-full h-full max-h-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-transform duration-700 z-10 ${!data.renderUrl ? 'scale-150 hover:scale-[1.6]' : 'scale-110 hover:scale-125'}`}
                  />
                </div>
              ) : (
                <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-black/20 rounded-3xl border border-white/5">
                  <span className="text-white/30 text-lg font-bold uppercase tracking-widest text-center px-4">Aperçu 3D<br />Indisponible</span>
                </div>
              )}
            </div>

            {/* Right Equipment Column */}
            <div className="flex flex-row md:flex-col gap-2 md:gap-3 flex-wrap justify-center order-3 z-20">
              {rightSlots.map(slotName => (
                <ItemSlot
                  key={slotName}
                  slotName={slotName}
                  item={getItemBySlotType(slotName, equipment)}
                  emptyIcon={SLOT_ICONS[slotName]}
                />
              ))}
            </div>

          </div>
        ) : (
          /* WCL Performances Section with Tabs */
          <div className="w-full max-w-6xl mx-auto mt-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative z-20">

            {!hasPerformances ? (
              <div className="flex flex-col items-center justify-center py-12 bg-black/20 rounded-xl border border-white/5">
                <AlertCircle className="w-12 h-12 text-amber-500/70 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider text-center">
                  Aucune performance synchronisée
                </h3>
                <p className="text-sm text-zinc-400 text-center mt-2 mb-6 max-w-md">
                  Les performances Warcraft Logs de ce personnage n'ont pas encore été synchronisées.
                </p>
                <button
                  onClick={async () => {
                    setSyncing(true);
                    try {
                      await syncCharacterWcl(data.id);
                    } finally {
                      setSyncing(false);
                    }
                  }}
                  disabled={syncing}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Synchroniser Warcraft Logs
                </button>
              </div>
            ) : (
              <>
                {/* Header section with Tabs and Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
                      <button
                        onClick={() => setActiveTab('mplus')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'mplus'
                            ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        Mythique+
                      </button>
                      <button
                        onClick={() => setActiveTab('raid')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'raid'
                            ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                      >
                        Raid
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                    {/* Metric selector for Healer on Raid tab */}
                    {activeTab === 'raid' && data.gameRole === 'HEALER' && (
                      <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
                        <button
                          onClick={() => setModalMetric('hps')}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${modalMetric === 'hps'
                              ? 'bg-amber-500 text-black'
                              : 'text-white/60 hover:text-white'
                            }`}
                        >
                          HPS
                        </button>
                        <button
                          onClick={() => setModalMetric('dps')}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${modalMetric === 'dps'
                              ? 'bg-amber-500 text-black'
                              : 'text-white/60 hover:text-white'
                            }`}
                        >
                          DPS
                        </button>
                      </div>
                    )}

                    {/* Raid difficulty selector */}
                    {activeTab === 'raid' && (
                      <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
                        <button
                          onClick={() => setRaidDifficultyView(4)}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${raidDifficultyView === 4
                              ? 'bg-amber-500 text-black'
                              : 'text-white/60 hover:text-white'
                            }`}
                        >
                          Héroïque
                        </button>
                        <button
                          onClick={() => setRaidDifficultyView(5)}
                          className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${raidDifficultyView === 5
                              ? 'bg-amber-500 text-black'
                              : 'text-white/60 hover:text-white'
                            }`}
                        >
                          Mythique
                        </button>
                      </div>
                    )}

                    {/* M+ Region selector */}
                    {activeTab === 'mplus' && (
                      <div className="flex bg-black/40 border border-white/10 rounded-lg p-1">
                        <button
                          onClick={() => setRegionView('global')}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${regionView === 'global'
                              ? 'bg-amber-500 text-black'
                              : 'text-white/60 hover:text-white'
                            }`}
                        >
                          Monde
                        </button>
                        <button
                          onClick={() => setRegionView('eu')}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${regionView === 'eu'
                              ? 'bg-amber-500 text-black'
                              : 'text-white/60 hover:text-white'
                            }`}
                        >
                          Europe
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSyncing(true);
                        syncCharacterWcl(data.id, {
                          onSettled: () => setSyncing(false)
                        });
                      }}
                      disabled={syncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      Sync
                    </button>
                  </div>
                </div>

                {/* Top-level average score card for Raid */}
                {activeTab === 'raid' && bestRaidPerformances.length > 0 && (
                  <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30">
                        <Trophy className="w-6.5 h-6.5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider">Score Moyen en Raid</h4>
                        <p className="text-xs text-zinc-400">Calculé sur la meilleure performance de chaque boss ({bestRaidPerformances.length} boss battus)</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-3xl font-black ${getParseColor(averageRaidParse)}`}>
                        {averageRaidParse.toFixed(1)}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Parse Moyen Global</span>
                    </div>
                  </div>
                )}

                {/* Performances Grid */}
                {filteredPerformances.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-black/20 rounded-xl border border-white/5">
                    <AlertCircle className="w-10 h-10 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground font-medium text-center">
                      Aucune performance trouvée avec les filtres actuels.
                    </p>
                    <p className="text-xs text-muted-foreground/60 text-center mt-1">
                      Réessayez une synchronisation pour récupérer les dernières données.
                    </p>
                  </div>
                ) : activeTab === 'mplus' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Object.entries(
                      filteredPerformances.reduce((acc, perf) => {
                        const arr = acc[perf.encounterId] || [];
                        arr.push(perf);
                        acc[perf.encounterId] = arr;
                        return acc;
                      }, {} as Record<number, typeof filteredPerformances>)
                    ).map(([encounterId, perfs]) => {
                      const dungeonId = Number(encounterId);
                      const dungeon = DUNGEON_DETAILS[dungeonId] || {
                        name: MPLUS_ENCOUNTERS[dungeonId] || `Donjon ${encounterId}`,
                        image: "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg",
                        gradient: "from-zinc-800/50 via-zinc-950/80 to-zinc-950",
                        textColor: "text-zinc-300"
                      };
                      return (
                        <div
                          key={encounterId}
                          className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 flex flex-col hover:border-white/15 transition-all duration-300 hover:shadow-lg hover:shadow-black/40"
                        >
                          {/* Dungeon Header with Image */}
                          <div className={`p-3 relative overflow-hidden bg-gradient-to-br ${dungeon.gradient} border-b border-white/5 flex items-center gap-3`}>
                            <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/5 blur-lg pointer-events-none" />
                            <img
                              src={dungeon.image}
                              alt={dungeon.name}
                              className="w-10 h-10 rounded-lg object-cover border border-white/15 shadow shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-extrabold text-white text-xs tracking-tight drop-shadow truncate" title={dungeon.name}>
                                {dungeon.name}
                              </h4>
                              <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider block mt-0.5">
                                Mythique+
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-zinc-950/20 flex flex-col gap-2 flex-1">
                            {perfs
                              .sort((a, b) => b.keyLevel - a.keyLevel)
                              .map((perf) => {
                                const engClass = data.class ? (WCL_CLASSES[data.class] || data.class) : '';
                                const engSpec = data.activeSpecName ? (WCL_SPECS[data.activeSpecName] || data.activeSpecName) : '';

                                const isEu = regionView === 'eu';
                                const displayRank = (isEu ? perf.rankRegion : perf.bestRank) || 0;
                                const regionParam = isEu ? '&region=2' : '';
                                const leaderboardUrl = `https://www.warcraftlogs.com/zone/rankings/47?boss=${perf.encounterId}&metric=dps&class=${engClass}&spec=${engSpec}&bracket=${perf.keyLevel - 1}${regionParam}`;

                                return (
                                  <div key={perf.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold px-2 py-0.5 rounded border text-[10px] ${getKeyLevelColor(perf.keyLevel)}`}>+{perf.keyLevel}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getRankBadgeStyle(displayRank)}`}>Top {displayRank}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                                        {perf.amount ? (perf.amount / 1000).toFixed(1) + 'k' : '-'}
                                      </span>
                                      <div className="flex gap-1.5">
                                        <a href={leaderboardUrl} target="_blank" rel="noopener noreferrer" className="text-amber-500/40 hover:text-amber-500 transition-colors" title="Top 100">
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* Raid view - clean best performances grid with progress bars */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {bestRaidPerformances
                        .sort((a, b) => a.encounterId - b.encounterId)
                        .map((perf) => {
                          const bossId = perf.encounterId;
                          const bossName = RAID_ENCOUNTERS[bossId] || `Boss ${bossId}`;
                          const bossDetail = RAID_DETAILS[bossId] || {
                            name: bossName,
                            image: "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg",
                            gradient: "from-zinc-800/50 via-zinc-950/80 to-zinc-950",
                            textColor: "text-zinc-300"
                          };

                          const engClass = data.class ? (WCL_CLASSES[data.class] || data.class) : '';
                          const engSpec = data.activeSpecName ? (WCL_SPECS[data.activeSpecName] || data.activeSpecName) : '';
                          const isEu = regionView === 'eu';
                          const regionParam = isEu ? '&region=2' : '';
                          const zoneId = [3176, 3177, 3179, 3178, 3180, 3181, 3306, 3182, 3183].includes(bossId) ? 46 : 44;
                          const leaderboardUrl = `https://www.warcraftlogs.com/zone/rankings/${zoneId}?boss=${bossId}&metric=${perf.metric || 'dps'}&class=${engClass}&spec=${engSpec}&difficulty=${perf.keyLevel}${regionParam}`;

                          const parse = perf.parsePercent || 0;
                          const ilvlParse = perf.ilvlParsePercent || 0;

                          return (
                            <div
                              key={perf.id}
                              className="relative overflow-hidden rounded-xl border bg-black/40 flex flex-col hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-black/40"
                              style={{
                                borderColor: `${getParseColorHex(parse)}30`
                              }}
                            >
                              {/* Boss Header with Image */}
                              <div 
                                className="p-3 relative overflow-hidden border-b border-white/5 flex items-center gap-3"
                                style={{
                                  background: `linear-gradient(135deg, ${getParseColorHex(parse)}40 0%, ${getParseColorHex(parse)}10 60%, rgba(0, 0, 0, 0.4) 100%)`
                                }}
                              >
                                <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/5 blur-lg pointer-events-none" />
                                <img
                                  src={bossDetail.image}
                                  alt={bossDetail.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-white/15 shadow shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-extrabold text-white text-xs tracking-tight drop-shadow truncate" title={bossDetail.name}>
                                    {bossDetail.name.split(',')[0]}
                                  </h4>
                                  <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider block mt-0.5">
                                    {perf.date ? formatLogDate(perf.date) : 'Raid'}
                                  </span>
                                </div>
                              </div>

                              {/* Parse / Performance Info */}
                              <div className="p-3 bg-zinc-950/20 flex flex-col justify-between flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Meilleur Parse</span>
                                  <div className="flex gap-1.5">
                                    <a href={perf.reportUrl} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" title="Report">
                                      <FileText className="w-3.5 h-3.5" />
                                    </a>
                                    <a href={leaderboardUrl} target="_blank" rel="noopener noreferrer" className="text-amber-500/40 hover:text-amber-500 transition-colors" title="Classement">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                </div>

                                <div className="flex items-baseline justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] uppercase font-black text-zinc-400 bg-white/5 px-1 py-0.5 rounded">{perf.metric}</span>
                                    <span className="font-mono font-bold text-white text-xs">
                                      {perf.amount ? (perf.amount / 1000).toFixed(1) + 'k' : '-'}
                                    </span>
                                  </div>
                                  <span className={`text-xl font-black ${getParseColor(parse)}`}>
                                    {parse.toFixed(0)}
                                  </span>
                                </div>

                                {/* Progress bar container */}
                                <div className="w-full bg-zinc-950/60 rounded-full h-1.5 overflow-hidden border border-white/5 mb-2.5">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${parse}%`,
                                      backgroundColor: getParseColorHex(parse),
                                      boxShadow: `0 0 6px ${getParseColorHex(parse)}80`
                                    }}
                                  />
                                </div>

                                <div className="flex justify-between items-center text-[9px] text-zinc-400 border-t border-white/5 pt-1.5">
                                  <span>Global: <strong className={getParseColor(parse)}>{parse.toFixed(0)}%</strong></span>
                                  <span>iLvl: <strong className={getParseColor(ilvlParse)}>{ilvlParse.toFixed(0)}%</strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* All Kills Detailed History sorted by boss */}
                    {filteredPerformances.length > 0 && (
                      <div className="mt-8 border-t border-white/10 pt-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <FileText className="w-4.5 h-4.5 text-amber-500" />
                          Historique Détaillé des Combats
                        </h3>
                        <div className="bg-black/40 rounded-xl border border-white/5 p-4 space-y-4">
                          {Object.entries(
                            filteredPerformances.reduce((acc, bp) => {
                              const arr = acc[bp.encounterId] || [];
                              arr.push(bp);
                              acc[bp.encounterId] = arr;
                              return acc;
                            }, {} as Record<number, typeof filteredPerformances>)
                          )
                            .sort(([aId], [bId]) => Number(aId) - Number(bId))
                            .map(([encounterId, perfs]) => {
                              const bossId = Number(encounterId);
                              const bossDetail = RAID_DETAILS[bossId] || {
                                name: RAID_ENCOUNTERS[bossId] || `Boss ${bossId}`,
                                image: "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg",
                                gradient: "from-zinc-800/50 via-zinc-950/80 to-zinc-950",
                                textColor: "text-zinc-300"
                              };

                              const engClass = data.class ? (WCL_CLASSES[data.class] || data.class) : '';
                              const engSpec = data.activeSpecName ? (WCL_SPECS[data.activeSpecName] || data.activeSpecName) : '';
                              const isEu = regionView === 'eu';
                              const regionParam = isEu ? '&region=2' : '';
                              const zoneId = [3176, 3177, 3179, 3178, 3180, 3181, 3306, 3182, 3183].includes(bossId) ? 46 : 44;

                              return (
                                <div key={bossId} className="flex flex-col md:flex-row gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0 items-start md:items-center">
                                  {/* Boss Info */}
                                  <div className="flex items-center gap-3 w-full md:w-[220px] shrink-0">
                                    <img
                                      src={bossDetail.image}
                                      alt={bossDetail.name}
                                      className="w-7 h-7 rounded object-cover border border-white/10 shrink-0"
                                    />
                                    <span className="font-extrabold text-white text-xs truncate">
                                      {bossDetail.name.split(',')[0]}
                                    </span>
                                  </div>
                                  {/* Kills List */}
                                  <div className="flex-1 flex flex-wrap gap-2 w-full">
                                    {perfs
                                      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                                      .map((bp) => {
                                        const bpParse = bp.parsePercent || 0;
                                        const bpIlvlParse = bp.ilvlParsePercent || 0;
                                        const bpLeaderboardUrl = `https://www.warcraftlogs.com/zone/rankings/${zoneId}?boss=${bp.encounterId}&metric=${bp.metric || 'dps'}&class=${engClass}&spec=${engSpec}&difficulty=${bp.keyLevel}${regionParam}`;

                                        const formattedDateParts = bp.date ? formatLogDate(bp.date).split(' ') : [];
                                        const displayDate = formattedDateParts.length >= 2 
                                          ? `${formattedDateParts[0]} ${formattedDateParts[1]}` 
                                          : 'Date';

                                        return (
                                          <div key={bp.id} className="bg-white/5 hover:bg-white/10 rounded-lg p-2 flex items-center justify-between text-xs border border-white/5 gap-4 transition-colors grow md:grow-0 min-w-[210px]">
                                            <div className="flex items-center gap-2">
                                              <span className="text-zinc-400 font-medium min-w-[50px]">
                                                {displayDate}
                                              </span>
                                              <span className="font-mono text-zinc-200 font-bold">
                                                {bp.amount ? (bp.amount / 1000).toFixed(1) + 'k' : '-'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <div className="flex gap-2 text-[10px] font-semibold">
                                                <span title="Parse Globale" className="text-zinc-400">
                                                  G: <span className={`font-black ${getParseColor(bpParse)}`}>{bpParse.toFixed(0)}</span>
                                                </span>
                                                <span title="Parse iLvl" className="text-zinc-400">
                                                  i: <span className={`font-black ${getParseColor(bpIlvlParse)}`}>{bpIlvlParse.toFixed(0)}</span>
                                                </span>
                                              </div>
                                              <div className="flex gap-1.5 shrink-0">
                                                <a href={bp.reportUrl} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors" title="Rapport">
                                                  <FileText className="w-3.5 h-3.5" />
                                                </a>
                                                <a href={bpLeaderboardUrl} target="_blank" rel="noopener noreferrer" className="text-amber-500/40 hover:text-amber-500 transition-colors" title="Classement">
                                                  <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

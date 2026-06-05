import { useState, useMemo, useEffect } from 'react';
import { useGetAllCharacters, useSyncCharacterWcl } from '@/api/queries';
import { Trophy, RefreshCw, AlertCircle, ArrowUpRight, ExternalLink, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { classIcons } from '@/lib/wowData';
import { WowIcon } from '@/components/ui/WowIcon';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getClassColorStyle } from '@/lib/wowColors';
import { WclCharacterSyncModal } from '@/components/characters/WclCharacterSyncModal';

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

const RAID_DETAILS: Record<number, DungeonInfo> = {
  // Zone 44 (Manaforge Omega)
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

  // Zone 46 (VS / DR / MQD)
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

const getDifficultyName = (diff: number) => {
  if (diff === 3) return "Normal";
  if (diff === 4) return "Héroïque";
  if (diff === 5) return "Mythique";
  return `Difficulty ${diff}`;
};

const getRaidDiffColor = (level: number) => {
  if (level === 5) return "text-purple-400 bg-purple-500/10 border-purple-500/30";
  if (level === 4) return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
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
  'Dévoreur': 'Devourer', 'Devourer': 'Devourer',
};

const getCharacterInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export function WclPerformancesPage() {
  const { data: allCharacters, isLoading, error } = useGetAllCharacters(true);
  const { mutateAsync: syncCharacterWcl } = useSyncCharacterWcl();
  const [syncingCharacterId, setSyncingCharacterId] = useState<string | null>(null);
  const [regionView, setRegionView] = useState<'global' | 'eu'>('global');
  const [activityType, setActivityType] = useState<'mplus' | 'raid'>('mplus');
  const [modalMetric, setModalMetric] = useState<'hps' | 'dps'>('hps');
  const [raidDifficultyView, setRaidDifficultyView] = useState<4 | 5>(5); // Default to Mythic (5)
  const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!notification) return;
    const timeout = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timeout);
  }, [notification]);

  useEffect(() => {
    if (selectedCharacter) {
      if (selectedCharacter.gameRole === 'HEALER') {
        setModalMetric('hps');
      } else {
        setModalMetric('dps');
      }
    }
  }, [selectedCharacter]);

  // Characters sorted by name for the dropdown selection
  const otherCharacters = useMemo(() => {
    if (!allCharacters) return [];
    return [...allCharacters].sort((a, b) => a.name.localeCompare(b.name));
  }, [allCharacters]);

  // Filter and sort characters by the number of WCL performances (Top 100)
  const rankedCharacters = useMemo(() => {
    if (!allCharacters) return [];
    
    return allCharacters
      .map((char) => {
        const filteredPerformances = (char.wclPerformances || []).filter((perf: any) => {
          const isRaidPerf = RAID_ENCOUNTERS[perf.encounterId] !== undefined;
          if (activityType === 'raid') {
            if (!isRaidPerf) return false;
            if (perf.keyLevel !== raidDifficultyView) return false;

            // Display 'hps' metric for healers and 'dps' for everyone else on the main page list
            const expectedMetric = char.gameRole === 'HEALER' ? 'hps' : 'dps';
            if ((perf.metric || 'dps') !== expectedMetric) return false;

            // Pour le raid, on s'intéresse à la parse, même s'il n'y a pas de bestRank (Top 500)
            return (perf.parsePercent && perf.parsePercent > 0) || (perf.ilvlParsePercent && perf.ilvlParsePercent > 0);
          } else {
            if (isRaidPerf) return false;
            // Pour le M+, on s'intéresse uniquement au Top 100
            if (regionView === 'eu') {
              return perf.rankRegion !== null && perf.rankRegion !== undefined && perf.rankRegion > 0;
            }
            return perf.bestRank !== null && perf.bestRank !== undefined && perf.bestRank > 0;
          }
        });

        let summaryPerformances = filteredPerformances;
        if (activityType === 'raid') {
          const summaryMap = new Map<number, any>();
          for (const perf of filteredPerformances) {
            const current = summaryMap.get(perf.encounterId);
            const currentParse = current
              ? Math.max(current.parsePercent || 0, current.ilvlParsePercent || 0)
              : 0;
            const perfParse = Math.max(perf.parsePercent || 0, perf.ilvlParsePercent || 0);
            if (!current || perfParse > currentParse) {
              summaryMap.set(perf.encounterId, perf);
            }
          }
          summaryPerformances = Array.from(summaryMap.values());
        }
        return {
          ...char,
          filteredPerformances,
          summaryPerformances,
        };
      })
      .filter((char) => char.filteredPerformances.length > 0)
      .sort((a, b) => {
        const aPerfs = activityType === 'raid' ? a.summaryPerformances : a.filteredPerformances;
        const bPerfs = activityType === 'raid' ? b.summaryPerformances : b.filteredPerformances;
        const aCount = aPerfs.length;
        const bCount = bPerfs.length;
        
        if (activityType === 'raid') {
          // For raid: sort by number of bosses killed, then by average parse
          if (bCount !== aCount) return bCount - aCount;
          
          const aAvg = aPerfs.reduce((acc: number, p: any) => acc + Math.max(p.parsePercent || 0, p.ilvlParsePercent || 0), 0) / (aCount || 1);
          const bAvg = bPerfs.reduce((acc: number, p: any) => acc + Math.max(p.parsePercent || 0, p.ilvlParsePercent || 0), 0) / (bCount || 1);
          if (Math.abs(bAvg - aAvg) > 0.1) return bAvg - aAvg;
        } else {
          // For M+: sort by number of keys in Top 100, then by highest key level
          if (bCount !== aCount) return bCount - aCount;
          
          const aMax = Math.max(...(a.filteredPerformances.map((p: any) => p.keyLevel) || [0]));
          const bMax = Math.max(...(b.filteredPerformances.map((p: any) => p.keyLevel) || [0]));
          if (bMax !== aMax) return bMax - aMax;
        }

        return b.ilvl - a.ilvl;
      });
  }, [allCharacters, regionView, activityType, raidDifficultyView]);



  return (
    <div className="min-h-full bg-background p-4 md:p-8">
      <div className="container mx-auto space-y-8 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400" />
              {activityType === 'mplus' ? "Leaderboard Mythique+ (Top 100)" : "Parses des membres"}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              {activityType === 'mplus' 
                ? "Ce classement affiche les joueurs de la guilde ayant réalisé des clés (entre +2 et +20) enregistrées dans le Top 100 de Warcraft Logs."
                : "Cette page affiche un résumé des parses des membres de la guilde sur chaque boss tombés."}
            </p>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {activityType === 'mplus'
                ? "Classement mondial et européen des performances de vos personnages en Mythique+"
                : "Classement mondial et européen des performances de vos personnages en Raid"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-3 flex-wrap">
              {/* Activity selector */}
              <div className="flex bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setActivityType('mplus')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activityType === 'mplus' 
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                  }`}
                >
                  Mythique+
                </button>
                <button
                  onClick={() => setActivityType('raid')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activityType === 'raid' 
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                  }`}
                >
                  Raid
                </button>
              </div>

              {/* Raid Difficulty selector */}
              {activityType === 'raid' && (
                <div className="flex bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setRaidDifficultyView(4)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      raidDifficultyView === 4 
                        ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                        : 'text-muted-foreground hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Héroïque
                  </button>
                  <button
                    onClick={() => setRaidDifficultyView(5)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      raidDifficultyView === 5 
                        ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                        : 'text-muted-foreground hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Mythique
                  </button>
                </div>
              )}


              {/* Region selector */}
              <div className="flex bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-1">
                <button
                  onClick={() => setRegionView('global')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                    regionView === 'global' 
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                  }`}
                >
                  Monde
                </button>
                <button
                  onClick={() => setRegionView('eu')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                    regionView === 'eu' 
                      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                  }`}
                >
                  Europe
                </button>
              </div>
            </div>
            
          </div>
        </div>

        {/* Synchroniser d'autres personnages */}
        <div className="rounded-xl border border-border/50 bg-card/20 p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Synchroniser un autre personnage</h4>
            <p className="text-xs text-muted-foreground">
              Choisissez n'importe quel personnage de la guilde pour importer et suivre ses performances.
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              Chaque synchronisation concerne un seul personnage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 active:scale-[0.98] rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all w-full md:w-auto shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Synchroniser des personnages
            </button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des données. Veuillez réessayer.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : rankedCharacters.length === 0 ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-12 text-center flex flex-col items-center">
            <Trophy className="h-12 w-12 text-amber-500/30 mb-4" />
            <p className="text-amber-500/80 text-xl font-medium">Aucune performance trouvée</p>
            <p className="text-sm text-amber-500/60 mt-2">
              Synchronisez les personnages depuis la fiche de personnages pour voir leurs classements ici.
            </p>
          </div>
        ) : activityType === 'raid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankedCharacters.map((character, index) => {
              const summaryPerfs = character.summaryPerformances || character.filteredPerformances;
              const avgParse = summaryPerfs.reduce((acc: number, p: any) => acc + Math.max(p.parsePercent || 0, p.ilvlParsePercent || 0), 0) / (summaryPerfs.length || 1);
              
              // Sort performances by encounterId
              const sortedPerfs = [...summaryPerfs].sort((a: any, b: any) => a.encounterId - b.encounterId);

              return (
                <div 
                  key={character.id}
                  className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/40 hover:bg-card/60 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col cursor-pointer"
                  onClick={() => setSelectedCharacter(character)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/50 to-transparent" />
                  
                  {/* Header */}
                  <div className="p-4 flex items-center justify-between border-b border-border/50 bg-black/20">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
                          <AvatarImage src={character.avatarUrl || undefined} alt={character.name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{getCharacterInitials(character.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground text-base" style={getClassColorStyle(character.class)}>{character.name}</h3>
                            <WowIcon name={classIcons[character.class] || 'inv_misc_questionmark'} size={14} className="rounded-sm" />
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{character.activeSpecName}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className="text-amber-500/80 font-semibold">{Math.round(character.ilvl)} iLvl</span>
                          </div>
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end justify-center">
                       <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 mb-0.5 font-semibold">Moyenne</div>
                       <div className={`text-2xl font-black leading-none drop-shadow-sm ${getParseColor(avgParse)}`}>
                         {avgParse.toFixed(1)}
                       </div>
                     </div>
                  </div>

                  {/* Boss List Recap */}
                  <div className="p-4 flex-1">
                    <div className="flex flex-col gap-1.5">
                      {sortedPerfs.map((perf: any) => {
                         const maxParse = Math.max(perf.parsePercent || 0, perf.ilvlParsePercent || 0);
                         const bossName = RAID_ENCOUNTERS[perf.encounterId] || `Boss ${perf.encounterId}`;
                         const shortBossName = bossName.split(',')[0];
                         return (
                           <div key={perf.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                             <span className="text-xs text-zinc-400 truncate pr-2" title={bossName}>{shortBossName}</span>
                             <span className={`text-sm font-bold ${getParseColor(maxParse)}`}>{maxParse.toFixed(1)}</span>
                           </div>
                         );
                      })}
                    </div>
                  </div>
                  
                  {/* Footer Sync Button */}
                  <div className="p-3 border-t border-border/50 flex justify-between items-center bg-black/20">
                     <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setSyncingCharacterId(character.id);
                          try {
                            await syncCharacterWcl(character.id);
                            setNotification({ message: "Synchronisation effectuée avec succès !", type: 'success' });
                          } catch (error: any) {
                            const msg = error?.response?.data?.message || "Une erreur est survenue lors de la synchronisation.";
                            setNotification({ message: msg, type: 'error' });
                          } finally {
                            setSyncingCharacterId(null);
                          }
                        }}
                        disabled={syncingCharacterId === character.id}
                        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md border border-border bg-zinc-900 hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncingCharacterId === character.id ? 'animate-spin text-primary' : ''}`} />
                        Sync
                      </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {rankedCharacters.map((character, index) => {
              return (
                <div 
                  key={character.id}
                  className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/40 hover:bg-card/60 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-amber-500/50 to-transparent" />
                  
                  <div 
                    className="p-5 flex flex-col md:flex-row gap-6 items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setSelectedCharacter(character)}
                  >
                    <div className="flex items-center gap-4 min-w-[250px]">
                      <div className="text-2xl font-bold text-muted-foreground/30 w-8 text-right">
                        #{index + 1}
                      </div>
                      
                      <Avatar className="h-14 w-14 ring-2 ring-background shadow-xl">
                        <AvatarImage src={character.avatarUrl || undefined} alt={character.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {getCharacterInitials(character.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">
                            {character.name}
                          </h3>
                          <WowIcon name={classIcons[character.class] || 'inv_misc_questionmark'} size={18} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {character.activeSpecName} {character.class}
                          </span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/30 text-amber-500/80">
                            {Math.round(character.ilvl)} iLvl
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Performances Summary */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-amber-500/80 bg-amber-500/10 px-3 py-1 rounded-full">
                          {character.filteredPerformances.length} perf{character.filteredPerformances.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="shrink-0 flex items-center justify-center">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSyncingCharacterId(character.id);
                            try {
                              await syncCharacterWcl(character.id);
                              setNotification({ message: "Synchronisation effectuée avec succès !", type: 'success' });
                            } catch (error: any) {
                              const msg = error?.response?.data?.message || "Une erreur est survenue lors de la synchronisation.";
                              setNotification({ message: msg, type: 'error' });
                            } finally {
                              setSyncingCharacterId(null);
                            }
                          }}
                          disabled={syncingCharacterId === character.id}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-border bg-background hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingCharacterId === character.id ? 'animate-spin text-primary' : ''}`} />
                          Sync
                        </button>
                      </div>

                      <div className="text-muted-foreground ml-2 bg-white/5 p-2 rounded-lg group-hover:text-amber-400 group-hover:bg-amber-500/10 transition-all duration-300">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal showing character's performance cards */}
        <Dialog open={!!selectedCharacter} onOpenChange={(open) => !open && setSelectedCharacter(null)}>
          <DialogContent className="max-w-5xl bg-zinc-950/98 backdrop-blur-3xl border border-zinc-800 text-foreground p-0 overflow-hidden rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {selectedCharacter && (
              <>
                {/* Immersive Banner Header */}
                <div className="relative p-6 border-b border-zinc-800/80 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between overflow-hidden">
                  {/* Class colored gradient blur */}
                  <div
                    className="absolute inset-0 z-0 opacity-15 pointer-events-none"
                    style={{
                      ...getClassColorStyle(selectedCharacter.class),
                      background: `radial-gradient(circle at 15% 50%, currentColor 0%, transparent 65%)`
                    }}
                  />
                  {selectedCharacter.renderUrl && (
                    <div
                      className="absolute inset-0 z-0 opacity-10 bg-cover bg-center pointer-events-none"
                      style={{
                        backgroundImage: `url(${selectedCharacter.renderUrl})`,
                        filter: 'blur(10px) brightness(0.5)'
                      }}
                    />
                  )}
                  
                  <div className="relative z-10 flex items-center gap-4">
                    <Avatar className="h-16 w-16 ring-2 ring-zinc-800 shadow-xl">
                      <AvatarImage src={selectedCharacter.avatarUrl || undefined} alt={selectedCharacter.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {getCharacterInitials(selectedCharacter.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <DialogTitle className="text-3xl font-black tracking-tight text-white uppercase" style={getClassColorStyle(selectedCharacter.class)}>
                          {selectedCharacter.name}
                        </DialogTitle>
                        <WowIcon name={classIcons[selectedCharacter.class] || 'inv_misc_questionmark'} size={24} className="rounded border border-white/10 shadow-md" />
                      </div>
                      <div className="text-sm text-zinc-400 mt-1.5 flex items-center gap-2.5 flex-wrap">
                        <span className="font-semibold text-zinc-300">{selectedCharacter.activeSpecName} {selectedCharacter.class}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-amber-400 font-bold px-2 py-0.5">
                          {Math.round(selectedCharacter.ilvl)} iLvl
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex gap-3 self-end md:self-center items-center">
                    {activityType === 'raid' && selectedCharacter.gameRole === 'HEALER' && (
                      <div className="flex bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-1">
                        <button
                          onClick={() => setModalMetric('hps')}
                          className={`px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                            modalMetric === 'hps'
                              ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                              : 'text-muted-foreground hover:text-white hover:bg-white/5'
                          }`}
                        >
                          Soins (HPS)
                        </button>
                        <button
                          onClick={() => setModalMetric('dps')}
                          className={`px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                            modalMetric === 'dps'
                              ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                              : 'text-muted-foreground hover:text-white hover:bg-white/5'
                          }`}
                        >
                          DPS
                        </button>
                      </div>
                    )}
                    <a
                      href={`https://www.warcraftlogs.com/character/eu/${selectedCharacter.realm ? selectedCharacter.realm.toLowerCase().replace(/\s+/g, '-') : ''}/${selectedCharacter.name.toLowerCase()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-700 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                      Warcraft Logs
                    </a>
                  </div>
                </div>
                
                {/* Scrollable grid container */}
                <div className="flex-1 overflow-y-auto p-6 max-h-[65vh] scrollbar-guild">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(
                      (selectedCharacter.wclPerformances || []).reduce((acc: any, perf: any) => {
                        const isRaidPerf = RAID_ENCOUNTERS[perf.encounterId] !== undefined;
                        
                        if (activityType === 'raid') {
                          if (!isRaidPerf) return acc;
                          if (perf.keyLevel !== raidDifficultyView) return acc;
                          const expectedMetric = selectedCharacter.gameRole === 'HEALER' ? modalMetric : 'dps';
                          if ((perf.metric || 'dps') !== expectedMetric) return acc;
                        } else {
                          if (isRaidPerf) return acc;
                        }

                        const arr = acc[perf.encounterId] || [];
                        arr.push(perf);
                        acc[perf.encounterId] = arr;
                        return acc;
                      }, {} as Record<number, any[]>)
                    ).map(([encounterId, perfs]: [string, any]) => {
                      const isRaid = activityType === 'raid';
                      const dungeonId = Number(encounterId);
                      const dungeon = isRaid
                        ? (RAID_DETAILS[dungeonId] || {
                            name: RAID_ENCOUNTERS[dungeonId] || `Boss ${encounterId}`,
                            image: "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg",
                            gradient: "from-zinc-850/55 via-zinc-950/80 to-zinc-950",
                            textColor: "text-zinc-300"
                          })
                        : (DUNGEON_DETAILS[dungeonId] || {
                            name: MPLUS_ENCOUNTERS[dungeonId] || `Donjon ${encounterId}`,
                            image: "/dungeons/algethar_academy.png",
                            gradient: "from-zinc-850/55 via-zinc-950/80 to-zinc-950",
                            textColor: "text-zinc-300"
                          });

                      return (
                        <div 
                          key={encounterId} 
                          className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col group/card hover:border-zinc-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-black/50"
                        >
                          {/* Dungeon/Raid Header with Icon */}
                          <div className={`p-4 relative overflow-hidden bg-gradient-to-br ${dungeon.gradient} border-b border-zinc-800/80 flex items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* Ambient glow behind icon */}
                              <div className="absolute -left-4 -top-4 w-16 h-16 rounded-full bg-white/5 blur-xl pointer-events-none" />
                              
                              <img 
                                src={dungeon.image} 
                                alt={dungeon.name} 
                                className="w-12 h-12 rounded-lg object-cover border border-white/20 shadow-lg shrink-0 group-hover/card:scale-105 transition-transform duration-300" 
                              />
                              
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-white text-sm tracking-tight drop-shadow-md truncate" title={dungeon.name}>
                                  {dungeon.name}
                                </h4>
                                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block mt-0.5">
                                  {isRaid ? "Raid" : "Mythique+"}
                                </span>
                              </div>
                            </div>
                            
                            {isRaid && (
                              <div className={`text-2xl font-black drop-shadow-sm shrink-0 ${getParseColor(Math.max(...perfs.map((p: any) => Math.max(p.parsePercent || 0, p.ilvlParsePercent || 0))))}`}>
                                {Math.max(...perfs.map((p: any) => Math.max(p.parsePercent || 0, p.ilvlParsePercent || 0))).toFixed(1)}
                              </div>
                            )}
                          </div>

                          {/* Dungeon/Raid Performance Keys/Difficulties list */}
                          <div className="p-0 bg-zinc-950/40 divide-y divide-white/5">
                            {[...perfs]
                              .sort((a: any, b: any) => {
                                if (isRaid) {
                                  const aDate = a.date ? new Date(a.date).getTime() : 0;
                                  const bDate = b.date ? new Date(b.date).getTime() : 0;
                                  if (aDate !== bDate) return bDate - aDate;
                                }
                                return b.keyLevel - a.keyLevel;
                              })
                              .map((perf: any) => {
                                const engClass = selectedCharacter.class ? (WCL_CLASSES[selectedCharacter.class] || selectedCharacter.class) : '';
                                const engSpec = selectedCharacter.activeSpecName ? (WCL_SPECS[selectedCharacter.activeSpecName] || selectedCharacter.activeSpecName) : '';
                                
                                const isEu = regionView === 'eu';
                                const displayRank = isEu ? perf.rankRegion : perf.bestRank;
                                const regionParam = isEu ? '&region=2' : '';
                                const zoneId = [3176, 3177, 3179, 3178, 3180, 3181, 3306, 3182, 3183].includes(perf.encounterId) ? 46 : 44;
                                const leaderboardUrl = isRaid
                                  ? `https://www.warcraftlogs.com/zone/rankings/${zoneId}?boss=${perf.encounterId}&metric=${perf.metric || 'dps'}&class=${engClass}&spec=${engSpec}&difficulty=${perf.keyLevel}${regionParam}`
                                  : `https://www.warcraftlogs.com/zone/rankings/47?boss=${perf.encounterId}&metric=dps&class=${engClass}&spec=${engSpec}&bracket=${perf.keyLevel - 1}${regionParam}`;
                                
                                return (
                                  <div key={perf.id} className="p-3 hover:bg-white/5 transition-colors flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      {/* Left side: Difficulty & Main Parse */}
                                      <div className="flex items-center gap-3">
                                        {isRaid ? (
                                          <div className="flex flex-col gap-1">
                                            <span className={`font-bold px-2 py-0.5 rounded-md border text-[10px] uppercase tracking-wider ${getRaidDiffColor(perf.keyLevel)}`}>
                                              {getDifficultyName(perf.keyLevel)}
                                            </span>
                                            {perf.date && (
                                              <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                                                {formatLogDate(perf.date)}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className={`font-bold px-2 py-0.5 rounded-md border text-[10px] ${getKeyLevelColor(perf.keyLevel)}`}>
                                            +{perf.keyLevel}
                                          </span>
                                        )}
                                        
                                        {isRaid ? (
                                          <span className={`text-xl font-black tracking-tight ${getParseColor(Math.max(perf.parsePercent || 0, perf.ilvlParsePercent || 0))}`}>
                                            {Math.max(perf.parsePercent || 0, perf.ilvlParsePercent || 0).toFixed(1)}
                                          </span>
                                        ) : (
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getRankBadgeStyle(displayRank)}`}>
                                            Top {displayRank}
                                          </span>
                                        )}
                                      </div>

                                      {/* Right side: Links */}
                                      <div className="flex gap-1.5">
                                        <a href={perf.reportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Rapport Warcraft Logs" onClick={(e) => e.stopPropagation()}>
                                          <FileText className="w-3.5 h-3.5" />
                                        </a>
                                        <a href={leaderboardUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors" title="Classement" onClick={(e) => e.stopPropagation()}>
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      </div>
                                    </div>

                                    {/* Sub-details Row */}
                                    <div className="flex items-center bg-black/40 rounded-lg p-2 border border-white/5 mt-1">
                                      <div className="flex-1 flex flex-col pl-2">
                                        <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">{(perf.metric || 'dps').toUpperCase()}</span>
                                        <span className="text-sm font-mono font-medium text-zinc-200">{perf.amount ? (perf.amount / 1000).toFixed(1) + 'k' : '-'}</span>
                                      </div>
                                      
                                      {isRaid && (
                                        <>
                                          <div className="flex-1 flex flex-col border-l border-white/10 pl-3">
                                            <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Globale</span>
                                            <span className={`text-sm font-bold ${getParseColor(perf.parsePercent || 0)}`}>
                                              {(perf.parsePercent || 0).toFixed(1)}
                                            </span>
                                          </div>
                                          <div className="flex-1 flex flex-col border-l border-white/10 pl-3">
                                            <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">iLvl</span>
                                            <span className={`text-sm font-bold ${getParseColor(perf.ilvlParsePercent || 0)}`}>
                                              {(perf.ilvlParsePercent || 0).toFixed(1)}
                                            </span>
                                          </div>
                                        </>
                                      )}
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
              </>
            )}
          </DialogContent>
        </Dialog>
        <WclCharacterSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          characters={otherCharacters}
          onSync={async (characterId) => {
            try {
              await syncCharacterWcl(characterId);
              setNotification({ message: "Synchronisation effectuée avec succès !", type: 'success' });
            } catch (error: any) {
              const msg = error?.response?.data?.message || "Une erreur est survenue lors de la synchronisation.";
              setNotification({ message: msg, type: 'error' });
              throw error; // Let the modal handle state/error logs if needed
            }
          }}
        />
        {notification && (
          <div className={`fixed bottom-5 right-5 z-[9999] rounded-md border ${
            notification.type === 'error'
              ? 'border-red-500/40 bg-red-950/80 text-red-200 shadow-red-500/10'
              : 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200 shadow-emerald-500/10'
          } px-4 py-3 text-sm font-medium shadow-xl backdrop-blur flex items-center gap-3 animate-fade-in`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

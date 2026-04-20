export interface VaultSlotViewModel {
  slot: 1 | 2 | 3;
  required: number;
  completed: number;
  rewardItemLevel: number | null;
  state: 'completed' | 'in-progress' | 'locked';
  details?: string;
}

type RaidDifficulty = 'lfr' | 'normal' | 'heroic' | 'mythic';

export interface MidnightVaultConfig {
  mythicPlus: {
    slots: [number, number, number];
    rewardByKeyThreshold: Array<{ minKeyLevel: number; itemLevel: number }>;
  };
  raid: {
    slots: [number, number, number];
    rewardByDifficulty: Record<RaidDifficulty, number>;
  };
}

// Default S1 Midnight table. Update this object when tuning changes.
export const MIDNIGHT_S1_VAULT_CONFIG: MidnightVaultConfig = {
  mythicPlus: {
    slots: [1, 4, 8],
    rewardByKeyThreshold: [
      { minKeyLevel: 2, itemLevel: 259 },
      { minKeyLevel: 4, itemLevel: 263 },
      { minKeyLevel: 6, itemLevel: 266 },
      { minKeyLevel: 7, itemLevel: 269 },
      { minKeyLevel: 10, itemLevel: 272 },
    ],
  },
  raid: {
    slots: [2, 4, 6],
    // Raid Vault ilvl depends on raid difficulty and bosses killed at that difficulty.
    // Values below use Midnight S1 raid boss drop breakpoints per difficulty.
    rewardByDifficulty: {
      lfr: 240,
      normal: 253,
      heroic: 266,
      mythic: 279,
    },
  },
};

const getThresholdReward = (
  value: number,
  thresholds: Array<{ minKeyLevel: number; itemLevel: number }>,
): number => {
  const sorted = [...thresholds].sort((a, b) => a.minKeyLevel - b.minKeyLevel);
  let reward = sorted[0]?.itemLevel ?? 0;

  for (const threshold of sorted) {
    if (value >= threshold.minKeyLevel) {
      reward = threshold.itemLevel;
    }
  }

  return reward;
};

const parseRaidDifficulty = (summary: string | undefined): RaidDifficulty | null => {
  if (!summary) {
    return null;
  }

  const upper = summary.toUpperCase();

  if (upper.includes('MYTHIC') || /\d+\/\d+\s*M\b/.test(upper)) {
    return 'mythic';
  }

  if (upper.includes('HEROIC') || /\d+\/\d+\s*H\b/.test(upper)) {
    return 'heroic';
  }

  if (upper.includes('NORMAL') || /\d+\/\d+\s*N\b/.test(upper)) {
    return 'normal';
  }

  if (upper.includes('LFR') || upper.includes('RAID FINDER') || /\d+\/\d+\s*R\b/.test(upper)) {
    return 'lfr';
  }

  return null;
};

const getDifficultyLabel = (difficulty: RaidDifficulty | null): string => {
  if (difficulty === 'mythic') {
    return 'Mythique';
  }
  if (difficulty === 'heroic') {
    return 'Heroique';
  }
  if (difficulty === 'normal') {
    return 'Normal';
  }
  if (difficulty === 'lfr') {
    return 'LFR';
  }

  return 'Inconnue';
};

export interface WeeklyMPlusRun {
  dungeon: string;
  short_name: string;
  mythic_level: number;
  url: string;
}

export const buildMythicPlusSlots = (
  runs: WeeklyMPlusRun[] | undefined,
  config: MidnightVaultConfig = MIDNIGHT_S1_VAULT_CONFIG,
): VaultSlotViewModel[] => {
  const sortedRuns = [...(runs ?? [])]
    .filter((run) => Number.isFinite(run.mythic_level))
    .sort((a, b) => b.mythic_level - a.mythic_level);

  return config.mythicPlus.slots.map((required, index) => {
    const runForSlot = sortedRuns[required - 1];
    const completed = Math.min(sortedRuns.length, required);
    const state = completed >= required
      ? 'completed'
      : completed > 0
        ? 'in-progress'
        : 'locked';
    const keyLevel = runForSlot?.mythic_level ?? 2;

    return {
      slot: (index + 1) as 1 | 2 | 3,
      required,
      completed,
      state,
      rewardItemLevel: getThresholdReward(
        keyLevel,
        config.mythicPlus.rewardByKeyThreshold,
      ),
      details: runForSlot
        ? `Cle retenue: +${runForSlot.mythic_level} (${runForSlot.short_name})`
        : undefined,
    };
  });
};

export const buildRaidSlots = (
  killedBosses: number,
  raidSummary: string | undefined,
  config: MidnightVaultConfig = MIDNIGHT_S1_VAULT_CONFIG,
): VaultSlotViewModel[] => {
  const difficulty = parseRaidDifficulty(raidSummary);
  const reward = difficulty
    ? config.raid.rewardByDifficulty[difficulty]
    : null;

  return config.raid.slots.map((required, index) => {
    const completed = Math.min(Math.max(killedBosses, 0), required);
    const state = completed >= required
      ? 'completed'
      : completed > 0
        ? 'in-progress'
        : 'locked';

    return {
      slot: (index + 1) as 1 | 2 | 3,
      required,
      completed,
      state,
      rewardItemLevel: reward,
      details: `Difficulte detectee: ${getDifficultyLabel(difficulty)}`,
    };
  });
};

export const getVaultOptimizationTip = (
  sections: Array<{
    label: string;
    slots: VaultSlotViewModel[];
    activityNoun: string;
  }>,
): string => {
  const candidates = sections
    .map((section) => {
      const nextSlot = section.slots.find((slot) => slot.state !== 'completed');
      if (!nextSlot) {
        return null;
      }

      return {
        label: section.label,
        rewardItemLevel: nextSlot.rewardItemLevel ?? -1,
        remaining: nextSlot.required - nextSlot.completed,
        activityNoun: section.activityNoun,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((a, b) => b.rewardItemLevel - a.rewardItemLevel);

  if (candidates.length === 0) {
    return 'Tous les slots sont deja completes cette semaine. Bravo!';
  }

  const best = candidates[0];
  if (best.rewardItemLevel < 0) {
    return `Priorite: ${best.label}. Faites encore ${best.remaining} ${best.activityNoun} pour debloquer un slot supplementaire.`;
  }

  return `Priorite: ${best.label}. Faites encore ${best.remaining} ${best.activityNoun} pour viser un slot a iLvl ${best.rewardItemLevel}.`;
};

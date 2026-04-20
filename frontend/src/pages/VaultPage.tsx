import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useGetMyCharacters, useGetVaultProgress } from '@/api/queries';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildMythicPlusSlots,
  buildRaidSlotsFromDifficultyProgress,
  type VaultSlotViewModel,
} from '@/lib/vaultMapper';

const roleLabel: Record<string, string> = {
  TANK: 'Tank',
  HEALER: 'Heal',
  DPS: 'DPS',
};

const getSlotClassName = (state: VaultSlotViewModel['state']) => {
  if (state === 'completed') {
    return 'border-amber-500/50 bg-amber-500/15';
  }

  if (state === 'in-progress') {
    return 'border-sky-500/40 bg-sky-500/10';
  }

  return 'border-slate-700/80 bg-slate-900/40';
};

function VaultSlotCard({ slot }: { slot: VaultSlotViewModel }) {
  const isCompleted = slot.state === 'completed';
  const isLocked = slot.state === 'locked';
  const progressPercent = Math.min(100, (slot.completed / slot.required) * 100);

  return (
    <article className={`rounded-xl border p-4 ${getSlotClassName(slot.state)}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Slot {slot.slot}</p>
        {isCompleted ? (
          <Badge className="border-amber-500/40 bg-amber-500/20 text-amber-300">Complete</Badge>
        ) : isLocked ? (
          <Badge variant="outline" className="border-slate-600 text-slate-300">Verrouille</Badge>
        ) : (
          <Badge className="border-sky-500/30 bg-sky-500/20 text-sky-300">En cours</Badge>
        )}
      </div>

      <p className="text-2xl font-bold text-amber-300">
        {slot.rewardItemLevel === null ? 'iLvl ?' : `iLvl ${slot.rewardItemLevel}`}
      </p>

      {slot.details ? (
        <p className="mt-1 text-xs text-slate-300">{slot.details}</p>
      ) : null}

      {!isCompleted ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-slate-300">{slot.completed}/{slot.required}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
            <div className="h-full rounded-full bg-sky-400/80" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function VaultSection({
  title,
  subtitle,
  slots,
}: {
  title: string;
  subtitle: string;
  slots: VaultSlotViewModel[];
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/30 p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {slots.map((slot) => (
          <VaultSlotCard key={slot.slot} slot={slot} />
        ))}
      </div>
    </section>
  );
}

export function VaultPage() {
  const user = useAuthStore((state) => state.user);
  const activeSharedProfile = useAuthStore((state) => state.activeSharedProfile);
  const { data: characters, isLoading: isCharactersLoading } = useGetMyCharacters(
    user?.userId,
    activeSharedProfile,
  );

  const charactersSorted = useMemo(() => {
    return [...(characters ?? [])].sort((a, b) => {
      if (a.isMain === b.isMain) {
        return b.ilvl - a.ilvl;
      }

      return a.isMain ? -1 : 1;
    });
  }, [characters]);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');

  useEffect(() => {
    const firstCharacter = charactersSorted[0];

    if (charactersSorted.length === 0) {
      setSelectedCharacterId('');
      return;
    }

    if (!selectedCharacterId && firstCharacter) {
      setSelectedCharacterId(firstCharacter.id);
      return;
    }

    const stillExists = charactersSorted.some((character) => character.id === selectedCharacterId);
    if (!stillExists && firstCharacter) {
      setSelectedCharacterId(firstCharacter.id);
    }
  }, [charactersSorted, selectedCharacterId]);

  const selectedCharacter = useMemo(() => {
    if (!selectedCharacterId) {
      return null;
    }

    return charactersSorted.find((character) => character.id === selectedCharacterId) ?? null;
  }, [charactersSorted, selectedCharacterId]);

  const { data: vaultProgress, isLoading: isVaultProgressLoading } = useGetVaultProgress(
    selectedCharacter?.id,
  );

  const mythicSlots = useMemo(
    () => buildMythicPlusSlots(vaultProgress?.mythicPlusWeeklyRuns),
    [vaultProgress?.mythicPlusWeeklyRuns],
  );

  const raidSlots = useMemo(
    () => buildRaidSlotsFromDifficultyProgress(vaultProgress?.raid),
    [vaultProgress?.raid],
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto space-y-5 p-4 md:p-8">
        <header className="rounded-xl border border-border/60 bg-card/30 p-4">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Saison 1 Midnight</p>
              <h1 className="text-2xl font-bold text-slate-100">Great Vault</h1>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Choisir un personnage</p>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {charactersSorted.map((character) => {
                  const isSelected = character.id === selectedCharacterId;
                  const isDemonHunter =
                    character.class === 'DemonHunter' || character.class === 'Demon Hunter';

                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => setSelectedCharacterId(character.id)}
                      className={`group rounded-xl border p-3 text-left transition-all ${
                        isDemonHunter ? 'min-w-[290px]' : 'min-w-[230px]'
                      } ${
                        isSelected
                          ? 'border-amber-400/70 bg-amber-500/15 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]'
                          : 'border-border/70 bg-slate-900/35 hover:border-slate-500/70 hover:bg-slate-800/35'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-800/70">
                          {character.avatarUrl ? (
                            <img
                              src={character.avatarUrl}
                              alt={`Avatar ${character.name}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-300">
                              {character.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-100">{character.name}</p>
                            {character.isMain ? (
                              <Badge className="border-amber-500/50 bg-amber-500/20 text-[10px] text-amber-300">
                                Main
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-slate-400">{character.realm}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-slate-600 text-slate-200">
                            {character.class}
                          </Badge>
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {roleLabel[character.gameRole] ?? character.gameRole}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-amber-300">{Math.round(character.ilvl)} iLvl</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {isCharactersLoading || isVaultProgressLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : selectedCharacter ? (
          <div className="space-y-4">
            <VaultSection
              title="Raid"
              subtitle={`Progression sur les raids de la semaine (2 / 5 / 8 boss)`}
              slots={raidSlots}
            />

            <VaultSection
              title="Donjons Mythique+"
              subtitle="Progression sur les cles de la semaine (1 / 4 / 8 runs)"
              slots={mythicSlots}
            />
          </div>
        ) : (
          <section className="rounded-xl border border-border/60 bg-card/20 p-4 text-sm text-slate-300">
            Aucun personnage synchronise.
          </section>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  useGetMyCharacters,
  useSyncCharacters,
  useSetMainCharacter,
  useSetRosterCharacter,
  useGetRaiderIoProfile,
  useGetAllEvents as useGetEvents,
  useGetEvent,
  useGetPolls,
  useGetRoster,
  useVotePoll,
  useUpsertAttendance,
  type AttendanceStatus,
  type EventAttendance,
  type RaiderIoProfile,
} from '@/api/queries';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { WowIcon } from '@/components/ui/WowIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { classIcons, roleIcons } from '@/lib/wowData';
import type { GameRole } from '@/types/character';
import { CharacterDetailPanel } from '@/components/characters/CharacterDetailPanel';

// Mapping des badges pour les rôles
const roleConfig: Record<GameRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  TANK: { label: 'Tank', variant: 'outline' },
  HEALER: { label: 'Healer', variant: 'outline' },
  DPS: { label: 'DPS', variant: 'outline' },
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

const roleLabelMap: Record<GameRole, string> = {
  TANK: 'Tank',
  HEALER: 'Healer',
  DPS: 'DPS',
};

const QUICK_STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'ACCEPTED', label: 'Present' },
  { value: 'TENTATIVE', label: 'Incertain' },
  { value: 'LATE', label: 'Retard' },
  { value: 'DECLINED', label: 'Absent' },
];

const formatUpcomingEventDate = (value: string): string => {
  const eventDate = new Date(value);
  const now = new Date();

  const isSameDay = eventDate.toDateString() === now.toDateString();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();

  const timePart = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameDay) {
    return `Aujourd'hui a ${timePart}`;
  }

  if (isTomorrow) {
    return `Demain a ${timePart}`;
  }

  const datePart = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });

  const formatted = `${datePart} - ${timePart}`;
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const TWW_RAID_PRIORITY_SLUGS = [
  'liberation-of-undermine',
  'nerubar-palace',
];

const getRaidProgressSummary = (rioData: RaiderIoProfile): string => {
  for (const slug of TWW_RAID_PRIORITY_SLUGS) {
    const summary = rioData.raid_progression?.[slug]?.summary;
    if (summary) {
      return summary;
    }
  }

  const firstAvailableSummary = Object.values(rioData.raid_progression ?? {}).find(
    (value) => value?.summary,
  )?.summary;

  return firstAvailableSummary || '0/8 N';
};

// Skeleton Loader
function CharactersTableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeSharedProfile = useAuthStore((s) => s.activeSharedProfile);
  const { data: characters, isLoading, error } = useGetMyCharacters(
    user?.userId,
    activeSharedProfile,
  );
  const { data: events } = useGetEvents();
  const { data: polls } = useGetPolls();
  const { data: roster } = useGetRoster();
  const votePollMutation = useVotePoll();
  const upsertAttendance = useUpsertAttendance();
  const syncMutation = useSyncCharacters(user?.userId);
  const setMainMutation = useSetMainCharacter(user?.userId);
  const setRosterMutation = useSetRosterCharacter(user?.userId);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'polls' | 'roster'>('events');
  const [quickAttendanceStatus, setQuickAttendanceStatus] = useState<AttendanceStatus>('TENTATIVE');
  const [quickAttendanceCharacterId, setQuickAttendanceCharacterId] = useState('');
  const [selectedPollOptionIds, setSelectedPollOptionIds] = useState<string[]>([]);
  const [showAllRosterQuickSwitch, setShowAllRosterQuickSwitch] = useState(false);

  if (error) {
    console.error('❌ Erreur API:', error);
  }

  const charactersSorted = useMemo(() => {
    return characters?.sort((a, b) => {
      if (a.isMain === b.isMain) {
        return b.ilvl - a.ilvl;
      }
      return a.isMain ? -1 : 1;
    }) || [];
  }, [characters]);

  const mainCharacter = useMemo(() => {
    if (!characters || characters.length === 0) {
      return null;
    }

    const explicitMain = characters.find((character) => character.isMain);
    if (explicitMain) {
      return explicitMain;
    }

    return characters.reduce((best, current) =>
      current.ilvl > best.ilvl ? current : best,
    );
  }, [characters]);

  const raiderIoCharacterId = selectedCharacterId ?? mainCharacter?.id;
  const { data: rioData, isLoading: rioLoading } = useGetRaiderIoProfile(
    raiderIoCharacterId,
  );

  const nextEvent = useMemo(() => {
    if (!events || events.length === 0) {
      return null;
    }

    const now = new Date();
    const upcoming = events
      .filter((event) => new Date(event.eventDate) > now)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

    return upcoming[0] || null;
  }, [events]);

  const { data: nextEventDetail } = useGetEvent(nextEvent?.id ?? '');

  const activePoll = useMemo(() => {
    if (!polls || polls.length === 0) {
      return null;
    }

    const activePolls = polls
      .filter((poll) => poll.isActive)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return activePolls[0] || null;
  }, [polls]);

  const myPollVotes = useMemo(() => {
    if (!activePoll || !user?.userId) {
      return [];
    }

    return activePoll.votes.filter((vote) => vote.userId === user.userId);
  }, [activePoll, user?.userId]);

  const hasVotedActivePoll = myPollVotes.length > 0;
  const canSubmitPollVote = !!activePoll?.id && selectedPollOptionIds.length > 0 && !votePollMutation.isPending;

  const pollLeader = useMemo(() => {
    if (!activePoll) {
      return null;
    }

    const countsByOptionId = activePoll.options.map((option) => {
      const count = activePoll.votes.filter((vote) => vote.optionId === option.id).length;
      return { option, count };
    });

    countsByOptionId.sort((a, b) => b.count - a.count);
    return countsByOptionId[0] ?? null;
  }, [activePoll]);

  useEffect(() => {
    if (!activePoll) {
      setSelectedPollOptionIds([]);
      return;
    }

    setSelectedPollOptionIds(myPollVotes.map((vote) => vote.optionId));
  }, [activePoll?.id, myPollVotes]);

  const rosterCounts = useMemo(() => {
    const base = { TANK: 0, HEALER: 0, DPS: 0 };

    for (const character of roster ?? []) {
      if (!character.inRoster) {
        continue;
      }
      base[character.gameRole] += 1;
    }

    return base;
  }, [roster]);

  const hasRosterCharacter = useMemo(() => {
    return Boolean(characters?.some((character) => character.inRoster || character.isMain));
  }, [characters]);

  const myRosterCharacter = useMemo(() => {
    return charactersSorted.find((character) => character.inRoster) ?? null;
  }, [charactersSorted]);

  const totalRosterCount = rosterCounts.TANK + rosterCounts.HEALER + rosterCounts.DPS;

  const rosterDistribution = useMemo(() => {
    if (totalRosterCount === 0) {
      return [
        { key: 'TANK', label: 'Tanks', count: 0, percent: 0, barClass: 'bg-sky-500/70' },
        { key: 'HEALER', label: 'Healers', count: 0, percent: 0, barClass: 'bg-emerald-500/70' },
        { key: 'DPS', label: 'DPS', count: 0, percent: 0, barClass: 'bg-amber-500/70' },
      ] as const;
    }

    return [
      {
        key: 'TANK',
        label: 'Tanks',
        count: rosterCounts.TANK,
        percent: Math.round((rosterCounts.TANK / totalRosterCount) * 100),
        barClass: 'bg-sky-500/70',
      },
      {
        key: 'HEALER',
        label: 'Healers',
        count: rosterCounts.HEALER,
        percent: Math.round((rosterCounts.HEALER / totalRosterCount) * 100),
        barClass: 'bg-emerald-500/70',
      },
      {
        key: 'DPS',
        label: 'DPS',
        count: rosterCounts.DPS,
        percent: Math.round((rosterCounts.DPS / totalRosterCount) * 100),
        barClass: 'bg-amber-500/70',
      },
    ] as const;
  }, [rosterCounts.HEALER, rosterCounts.DPS, rosterCounts.TANK, totalRosterCount]);

  const rosterQuickSwitchCharacters = useMemo(() => {
    if (showAllRosterQuickSwitch) {
      return charactersSorted;
    }

    return charactersSorted.slice(0, 1);
  }, [charactersSorted, showAllRosterQuickSwitch]);

  const myNextEventAttendance = useMemo((): EventAttendance | undefined => {
    if (!nextEventDetail || !user?.userId) {
      return undefined;
    }

    return nextEventDetail.attendances.find((attendance) => attendance.userId === user.userId);
  }, [nextEventDetail, user?.userId]);

  const isRegisteredToNextEvent =
    !!myNextEventAttendance && myNextEventAttendance.status !== 'DECLINED';

  const quickRequiresCharacter = quickAttendanceStatus !== 'DECLINED';
  const canQuickRegister =
    !!nextEvent?.id && (!quickRequiresCharacter || !!quickAttendanceCharacterId);

  const selectedCharacter = useMemo(() => {
    if (selectedCharacterId) {
      return charactersSorted.find((character) => character.id === selectedCharacterId) ?? null;
    }

    return mainCharacter;
  }, [charactersSorted, selectedCharacterId, mainCharacter]);

  useEffect(() => {
    if (!selectedCharacterId && mainCharacter?.id) {
      setSelectedCharacterId(mainCharacter.id);
      return;
    }

    if (
      selectedCharacterId &&
      charactersSorted.length > 0 &&
      !charactersSorted.some((character) => character.id === selectedCharacterId)
    ) {
      setSelectedCharacterId(mainCharacter?.id ?? null);
    }
  }, [charactersSorted, mainCharacter?.id, selectedCharacterId]);

  useEffect(() => {
    if (myNextEventAttendance) {
      setQuickAttendanceStatus(myNextEventAttendance.status);
      setQuickAttendanceCharacterId(myNextEventAttendance.characterId ?? '');
      return;
    }

    setQuickAttendanceStatus('TENTATIVE');
    setQuickAttendanceCharacterId(mainCharacter?.id ?? '');
  }, [myNextEventAttendance, mainCharacter?.id]);

  useEffect(() => {
    if (!activePoll) {
      setSelectedPollOptionId('');
      return;
    }

    if (myPollVote?.optionId) {
      setSelectedPollOptionId(myPollVote.optionId);
      return;
    }

    setSelectedPollOptionId('');
  }, [activePoll, myPollVote?.optionId]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 md:p-6">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                Centre d&apos;Action
              </p>

              <div className="mb-4 flex gap-2 border-b border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('events')}
                  className={activeTab === 'events'
                    ? 'rounded-md bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-500'
                    : 'px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200'}
                >
                  Evenements
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('polls')}
                  className={activeTab === 'polls'
                    ? 'rounded-md bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-500'
                    : 'px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200'}
                >
                  <span className="inline-flex items-center gap-2">
                    Sondages
                    {activePoll && !hasVotedActivePoll ? (
                      <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                    ) : null}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className={activeTab === 'roster'
                    ? 'rounded-md bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-500'
                    : 'px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200'}
                >
                  Roster
                </button>
              </div>

              {activeTab === 'events' ? (
                !nextEvent ? (
                  <p className="text-slate-400">
                    Aucun evenement de guilde prevu prochainement. Quartier libre !
                  </p>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-slate-100">
                      {nextEvent.title}
                    </h2>
                    <p className="mb-4 mt-1 text-sm text-slate-300">
                      {formatUpcomingEventDate(nextEvent.eventDate)}
                    </p>

                    {isRegisteredToNextEvent ? (
                      <div className="mb-4 inline-flex w-fit rounded-md border border-emerald-500/40 bg-emerald-600/15 px-3 py-1.5 text-sm font-medium text-emerald-300">
                        Inscrit en tant que {roleLabelMap[myNextEventAttendance?.character?.gameRole || 'DPS']} {myNextEventAttendance?.character?.name ? `(${myNextEventAttendance.character.name})` : ''}
                      </div>
                    ) : (
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <span className="inline-flex rounded-md border border-orange-500/40 bg-orange-600/15 px-3 py-1.5 text-sm font-medium text-orange-300">
                          Non inscrit
                        </span>
                      </div>
                    )}

                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!nextEvent?.id || !canQuickRegister) {
                          return;
                        }

                        upsertAttendance.mutate({
                          eventId: nextEvent.id,
                          status: quickAttendanceStatus,
                          characterId: quickAttendanceStatus === 'DECLINED' ? undefined : (quickAttendanceCharacterId || undefined),
                        });
                      }}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setQuickAttendanceStatus(option.value)}
                            className={quickAttendanceStatus === option.value
                              ? 'rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-2 text-xs font-semibold text-amber-300'
                              : 'rounded-md border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700'}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      {quickRequiresCharacter ? (
                        <select
                          value={quickAttendanceCharacterId}
                          onChange={(event) => setQuickAttendanceCharacterId(event.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-amber-500"
                        >
                          <option value="">Choisir un personnage</option>
                          {charactersSorted.map((character) => (
                            <option key={character.id} value={character.id}>
                              {character.name} - {character.class} ({Math.round(character.ilvl)} iLvl)
                            </option>
                          ))}
                        </select>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="submit"
                          disabled={!canQuickRegister || upsertAttendance.isPending}
                          className="inline-flex items-center rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {upsertAttendance.isPending ? 'Inscription...' : 'S\'inscrire'}
                        </button>

                        <Link
                          to={`/events/${nextEvent.id}`}
                          className="inline-flex items-center rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
                        >
                          Ouvrir le detail
                        </Link>
                      </div>

                      {upsertAttendance.isSuccess ? (
                        <p className="text-xs text-emerald-300">Inscription mise a jour.</p>
                      ) : null}
                    </form>
                  </>
                )
              ) : null}

              {activeTab === 'polls' ? (
                !activePoll ? (
                  <p className="text-slate-400">Aucun sondage en cours.</p>
                ) : (
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">{activePoll.question}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {activePoll.allowMultipleSelections ? 'Réponses multiples autorisées' : 'Réponse unique'}
                    </p>

                    <form
                      className="mt-4 space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!canSubmitPollVote || !activePoll?.id) {
                          return;
                        }

                        votePollMutation.mutate({
                          pollId: activePoll.id,
                          optionIds: selectedPollOptionIds,
                        });
                      }}
                    >
                      {activePoll.options.map((option) => {
                        const isSelected = selectedPollOptionIds.includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              if (activePoll.allowMultipleSelections) {
                                setSelectedPollOptionIds((current) => {
                                  if (current.includes(option.id)) {
                                    return current.filter((selectedOptionId) => selectedOptionId !== option.id);
                                  }

                                  return [...current, option.id];
                                });
                                return;
                              }

                              setSelectedPollOptionIds([option.id]);
                            }}
                            disabled={votePollMutation.isPending}
                            className={isSelected
                              ? 'mb-2 w-full rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-300'
                              : 'mb-2 w-full rounded bg-slate-800 px-3 py-2 text-left text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60'}
                          >
                            {option.text}
                          </button>
                        );
                      })}

                      <button
                        type="submit"
                        disabled={!canSubmitPollVote}
                        className="inline-flex items-center rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {votePollMutation.isPending ? 'Vote en cours...' : 'Voter'}
                      </button>
                    </form>

                    {hasVotedActivePoll ? (
                      <div className="mt-4 space-y-2 text-sm text-slate-300">
                        <p>
                          Vous avez vote pour :{' '}
                          <span className="font-semibold text-slate-100">
                            {myPollVotes.map((vote) => vote.option.text).join(', ') || 'Option inconnue'}
                          </span>
                        </p>
                        <p>
                          Option en tete :{' '}
                          <span className="font-semibold text-amber-400">
                            {pollLeader?.option.text || 'Aucune'}
                          </span>
                          {pollLeader ? ` (${pollLeader.count} vote${pollLeader.count > 1 ? 's' : ''})` : ''}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )
              ) : null}

              {activeTab === 'roster' ? (
                !hasRosterCharacter ? (
                  <div className="space-y-3 rounded-md border border-orange-500/40 bg-orange-600/10 p-3 text-sm text-orange-300">
                    <p>
                      ⚠️ Vous n&apos;avez pas defini de personnage pour le roster. Selectionnez-en un rapidement ci-dessous.
                    </p>

                    {charactersSorted.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {charactersSorted.slice(0, 3).map((character) => (
                          <button
                            key={character.id}
                            type="button"
                            onClick={() => setRosterMutation.mutate(character.id)}
                            disabled={setRosterMutation.isPending}
                            className="w-full rounded-md border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-left text-xs font-medium text-orange-200 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Definir {character.name} ({character.class})
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-4 text-sm text-slate-300">
                    <div className="rounded-lg border border-slate-700/80 bg-slate-800/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Mon perso roster</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-100">
                            {myRosterCharacter?.name || 'Aucun personnage'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {myRosterCharacter ? `${myRosterCharacter.class} - ${Math.round(myRosterCharacter.ilvl)} iLvl` : 'Selectionnez votre personnage principal de roster'}
                          </p>
                        </div>
                        {myRosterCharacter ? (
                          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                            Actif
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-700/80 bg-slate-800/30 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-semibold text-slate-100">Composition actuelle</p>
                        <span className="text-xs text-slate-400">{totalRosterCount} joueurs</span>
                      </div>

                      <div className="space-y-2.5">
                        {rosterDistribution.map((item) => (
                          <div key={item.key}>
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-slate-300">{item.label}</span>
                              <span className="text-slate-400">{item.count} ({item.percent}%)</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/80">
                              <div className={`h-full rounded-full ${item.barClass}`} style={{ width: `${item.percent}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Changer rapidement</p>
                      <div className="grid grid-cols-1 gap-2">
                        {rosterQuickSwitchCharacters.map((character) => {
                          const isCurrentRoster = character.inRoster;

                          return (
                            <button
                              key={character.id}
                              type="button"
                              onClick={() => setRosterMutation.mutate(character.id)}
                              disabled={setRosterMutation.isPending || isCurrentRoster}
                              className={isCurrentRoster
                                ? 'w-full rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-left text-xs font-semibold text-emerald-300'
                                : 'w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60'}
                            >
                              <span className="block text-sm">{character.name}</span>
                              <span className="text-[11px] text-slate-400">{character.class} - {Math.round(character.ilvl)} iLvl</span>
                            </button>
                          );
                        })}
                      </div>

                      {charactersSorted.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setShowAllRosterQuickSwitch((value) => !value)}
                          className="mt-2 inline-flex items-center rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
                        >
                          {showAllRosterQuickSwitch ? 'Voir moins' : `Voir plus (${charactersSorted.length - 1})`}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              ) : null}
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Erreur lors du chargement des personnages. Veuillez réessayer.
                  </AlertDescription>
                </Alert>
              )}

              {isLoading ? (
                <CharactersTableSkeleton />
              ) : charactersSorted.length === 0 ? (
                <div className="space-y-4 rounded-xl border border-border/60 bg-card/20 p-4 md:p-6">
                  <Alert className="border-dashed bg-card/50 border-border/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Aucun personnage trouvé. Synchronisez vos personnages avec votre compte Battle.net.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCharacter ? (
                    <>
                      <div className="rounded-xl border border-border/60 bg-card/20 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedCharacter.isMain ? (
                            <Badge className="border border-yellow-500/30 bg-yellow-500/15 text-yellow-300">
                              Main
                            </Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setMainMutation.mutate(selectedCharacter.id)}
                              disabled={setMainMutation.isPending}
                              className="rounded-md border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Définir Main
                            </button>
                          )}

                          {selectedCharacter.inRoster ? (
                            <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                              Roster
                            </Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRosterMutation.mutate(selectedCharacter.id)}
                              disabled={setRosterMutation.isPending}
                              className="rounded-md border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Définir Roster
                            </button>
                          )}

                          <div className="ml-auto flex flex-wrap items-center gap-2">
                            <span className="inline-flex bg-amber-600/20 text-amber-500 px-2 py-1 rounded text-sm font-semibold">
                              iLvl {Math.round(selectedCharacter.ilvl)}
                            </span>

                            {rioLoading ? (
                              <Skeleton className="h-7 w-24 rounded bg-slate-800/50" />
                            ) : rioData ? (
                              <>
                                <span
                                  className="inline-flex bg-slate-800/80 border border-slate-700 text-slate-200 px-2 py-1 rounded text-sm font-semibold items-center gap-1.5"
                                  title="Score Mythique+"
                                >
                                  ⚔️ {rioData.mythic_plus_scores_by_season?.[0]?.scores?.all || 0}
                                </span>
                                <span
                                  className="inline-flex bg-slate-800/80 border border-slate-700 text-slate-200 px-2 py-1 rounded text-sm font-semibold items-center gap-1.5"
                                  title="Progression Raid"
                                >
                                  👑 {getRaidProgressSummary(rioData)}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <CharacterDetailPanel
                        data={selectedCharacter}
                        onSyncAll={() => syncMutation.mutate()}
                        isSyncing={syncMutation.isPending}
                      />
                    </>
                  ) : (
                    <Alert className="border-dashed border-border/50 bg-card/50">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Sélectionnez un personnage dans le panneau de droite pour afficher sa fiche.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

          </div>

          <aside className="rounded-xl border border-border/60 bg-card/30 p-3 md:p-4 xl:sticky xl:top-0 xl:self-start xl:flex xl:h-[calc(100vh-2rem)] xl:flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Mes personnages
              </h3>
              <Badge variant="outline" className="text-xs">
                {charactersSorted.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : charactersSorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun personnage synchronisé.</p>
            ) : (
              <div className="scrollbar-guild mt-1 space-y-2 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1">
                {charactersSorted.map((character) => {
                  const isActive = selectedCharacter?.id === character.id;

                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => setSelectedCharacterId(character.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        isActive
                          ? 'border-primary/50 bg-primary/10 shadow-sm'
                          : 'border-border/70 bg-background/50 hover:border-primary/30 hover:bg-background/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-1 ring-border/80">
                          <AvatarImage src={character.avatarUrl || undefined} alt={`Avatar de ${character.name}`} />
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {getCharacterInitials(character.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {character.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {character.realm || 'Royaume inconnu'}
                          </p>
                        </div>

                        <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          {Math.round(character.ilvl)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          <WowIcon name={classIcons[character.class] || 'inv_misc_questionmark'} size={14} />
                          {character.class}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          <WowIcon name={roleIcons[character.gameRole] || 'inv_misc_questionmark'} size={14} />
                          {roleConfig[character.gameRole]?.label || character.gameRole}
                        </span>
                        {character.isMain ? (
                          <Badge className="border border-yellow-500/30 bg-yellow-500/15 text-[11px] text-yellow-300">
                            Main
                          </Badge>
                        ) : null}
                        {character.inRoster ? (
                          <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-[11px] text-emerald-300">
                            Roster
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

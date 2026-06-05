import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  useGetMyCharacters,
  useGetAllEvents as useGetEvents,
  useGetEvent,
  useGetPolls,
  useVotePoll,
  useUpsertAttendance,
  type AttendanceStatus,
  type EventAttendance,
} from '@/api/queries';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Search } from 'lucide-react';
import { WowIcon } from '@/components/ui/WowIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { classIcons, roleIcons } from '@/lib/wowData';
import type { GameRole } from '@/types/character';
import { GuildCharacterSheet } from '@/components/characters/GuildCharacterSheet';
import { SyncMissingCharactersModal } from '@/components/characters/SyncMissingCharactersModal';
import { getClassColorStyle } from '@/lib/wowColors';

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

// Deleted TWW_RAID_PRIORITY_SLUGS

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
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeSharedProfile = useAuthStore((s) => s.activeSharedProfile);
  const { data: characters, isLoading, error } = useGetMyCharacters(
    user?.userId,
    activeSharedProfile,
  );
  const { data: events } = useGetEvents();
  const { data: polls } = useGetPolls();
  const votePollMutation = useVotePoll();
  const upsertAttendance = useUpsertAttendance();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'polls' | 'sync'>('events');
  const [quickAttendanceStatus, setQuickAttendanceStatus] = useState<AttendanceStatus>('TENTATIVE');
  const [selectedPollOptionIds, setSelectedPollOptionIds] = useState<string[]>([]);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  if (error) {
    console.error('❌ Erreur API:', error);
  }

  const rosterCharacter = useMemo(() => {
    return characters?.find((char) => char.inRoster) ?? null;
  }, [characters]);

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

  const mains = useMemo(() => {
    return charactersSorted.filter((char) => char.isMain);
  }, [charactersSorted]);

  const alts = useMemo(() => {
    return charactersSorted.filter((char) => !char.isMain);
  }, [charactersSorted]);

  // Deleted RaiderIo query

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


  const myNextEventAttendance = useMemo((): EventAttendance | undefined => {
    if (!nextEventDetail || !user?.userId) {
      return undefined;
    }

    return nextEventDetail.attendances.find((attendance) => attendance.userId === user.userId);
  }, [nextEventDetail, user?.userId]);

  const isRegisteredToNextEvent =
    !!myNextEventAttendance && myNextEventAttendance.status !== 'DECLINED';

  const canQuickRegister = !!nextEvent?.id;

  const selectedCharacter = useMemo(() => {
    if (selectedCharacterId) {
      return charactersSorted.find((character) => character.id === selectedCharacterId) ?? null;
    }

    return mainCharacter;
  }, [charactersSorted, selectedCharacterId, mainCharacter]);



  useEffect(() => {
    if (myNextEventAttendance) {
      setQuickAttendanceStatus(myNextEventAttendance.status);
      return;
    }

    setQuickAttendanceStatus('TENTATIVE');
  }, [myNextEventAttendance, mainCharacter?.id]);

  useEffect(() => {
    if (!syncToastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSyncToastMessage(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [syncToastMessage]);

  const handleImportedCharacters = async (count: number) => {
    await queryClient.invalidateQueries({ queryKey: ['characters'] });
    setSyncToastMessage(
      `${count} personnage${count > 1 ? 's' : ''} importe${count > 1 ? 's' : ''} avec succes.`,
    );
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-4 md:p-6 text-card-foreground">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Centre d&apos;Action
              </p>

              <div className="mb-4 flex gap-2 border-b border-border pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('events')}
                  className={activeTab === 'events'
                    ? 'rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary'
                    : 'px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'}
                >
                  Evenements
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('polls')}
                  className={activeTab === 'polls'
                    ? 'rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary'
                    : 'px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'}
                >
                  <span className="inline-flex items-center gap-2">
                    Sondages
                    {activePoll && !hasVotedActivePoll ? (
                      <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
                    ) : null}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('sync')}
                  className={activeTab === 'sync'
                    ? 'rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary'
                    : 'px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'}
                >
                  Synchronisation
                </button>
              </div>

              {activeTab === 'events' ? (
                !nextEvent ? (
                  <p className="text-muted-foreground">
                    Aucun evenement de guilde prevu prochainement. Quartier libre !
                  </p>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-foreground">
                      {nextEvent.title}
                    </h2>
                    <p className="mb-4 mt-1 text-sm text-muted-foreground">
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

                    {rosterCharacter ? (
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
                          });
                        }}
                      >
                        <div className="mb-2 flex items-center gap-2 rounded border border-border bg-muted/30 px-3 py-2">
                          <WowIcon name={classIcons[rosterCharacter.class] || 'inv_misc_questionmark'} size={18} />
                          <span className="text-sm font-medium text-foreground">
                            {rosterCharacter.name}
                          </span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {Math.round(rosterCharacter.ilvl)} iLvl
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {QUICK_STATUS_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setQuickAttendanceStatus(option.value)}
                              className={quickAttendanceStatus === option.value
                                ? 'rounded-md border border-primary/40 bg-primary/10 px-2.5 py-2 text-xs font-semibold text-primary'
                                : 'rounded-md border border-border bg-muted px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="submit"
                            disabled={!canQuickRegister || upsertAttendance.isPending}
                            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {upsertAttendance.isPending ? 'Inscription...' : 'S\'inscrire'}
                          </button>

                          <Link
                            to={`/events/${nextEvent.id}`}
                            className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                          >
                            Ouvrir le detail
                          </Link>
                        </div>

                        {upsertAttendance.isSuccess ? (
                          <p className="text-xs text-emerald-300">Inscription mise a jour.</p>
                        ) : null}
                      </form>
                    ) : (
                      !isLoading ? (
                        <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                          Vous devez faire partie du roster pour vous inscrire à un évènement.
                        </div>
                      ) : null
                    )}
                  </>
                )
              ) : null}

              {activeTab === 'polls' ? (
                !activePoll ? (
                  <p className="text-muted-foreground">Aucun sondage en cours.</p>
                ) : (
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{activePoll.question}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
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
                              ? 'mb-2 w-full rounded border border-primary/40 bg-primary/10 px-3 py-2 text-left text-sm text-primary font-medium'
                              : 'mb-2 w-full rounded bg-muted px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60'}
                          >
                            {option.text}
                          </button>
                        );
                      })}

                      <button
                        type="submit"
                        disabled={!canSubmitPollVote}
                        className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {votePollMutation.isPending ? 'Vote en cours...' : 'Voter'}
                      </button>
                    </form>

                    {hasVotedActivePoll ? (
                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <p>
                          Vous avez vote pour :{' '}
                          <span className="font-semibold text-foreground">
                            {myPollVotes.map((vote) => vote.option.text).join(', ') || 'Option inconnue'}
                          </span>
                        </p>
                        <p>
                          Option en tete :{' '}
                          <span className="font-semibold text-primary">
                            {pollLeader?.option.text || 'Aucune'}
                          </span>
                          {pollLeader ? ` (${pollLeader.count} vote${pollLeader.count > 1 ? 's' : ''})` : ''}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )
              ) : null}

              {activeTab === 'sync' ? (
                <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Gestion du roster</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">Synchronisation manuelle</h2>
                    <p className="mt-1 text-muted-foreground">
                      Recherchez les personnages de votre compte Battle.net presents dans la guilde
                      The Good Place qui ne sont pas encore importes sur le site.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSyncModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Search className="h-4 w-4" />
                    Chercher de nouveaux personnages
                  </button>
                </div>
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
                    <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-fade-in-up">
                      <GuildCharacterSheet data={selectedCharacter} />
                    </div>
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

          <aside className="rounded-xl border border-white/10 bg-black/40 p-3 md:p-4 xl:sticky xl:top-4 xl:self-start xl:flex xl:h-[calc(100vh-3rem)] xl:flex-col backdrop-blur-md shadow-xl w-full">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/5 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Mes personnages
              </h3>
              <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-white font-bold">
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
              <div className="scrollbar-guild mt-1 space-y-4 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1">
                {mains.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-black text-amber-500/70 tracking-widest pl-1">
                      Personnage Principal
                    </div>
                    {mains.map((character) => {
                      const isActive = selectedCharacter?.id === character.id;
                      const classColor = getClassColorStyle(character.class).color || 'var(--color-primary)';

                      return (
                        <button
                          key={character.id}
                          type="button"
                          onClick={() => setSelectedCharacterId(character.id)}
                          className={`relative w-full rounded-xl border p-3 text-left transition-all duration-300 overflow-hidden ${isActive
                              ? 'border-primary/40 shadow-lg shadow-black/50 glow-gold'
                              : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                            }`}
                          style={{
                            background: isActive
                              ? `linear-gradient(90deg, ${classColor}15 0%, rgba(20, 20, 30, 0.9) 100%)`
                              : 'rgba(0, 0, 0, 0.25)'
                          }}
                        >
                          {isActive && (
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1 rounded-r-md"
                              style={{ backgroundColor: classColor }}
                            />
                          )}

                          <div className="flex items-center gap-3">
                            <Avatar
                              className="h-10 w-10 ring-1 transition-all duration-300"
                              style={{
                                borderColor: isActive ? classColor : 'rgba(255,255,255,0.1)',
                                boxShadow: isActive ? `0 0 10px ${classColor}50` : 'none'
                              }}
                            >
                              <AvatarImage src={character.avatarUrl || undefined} alt={`Avatar de ${character.name}`} />
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {getCharacterInitials(character.name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold tracking-wide uppercase transition-colors" style={{ color: classColor }}>
                                {character.name}
                              </p>
                              <p className="truncate text-[10px] uppercase font-bold text-slate-400">
                                {character.realm || 'Royaume inconnu'}
                              </p>
                            </div>

                            <span
                              className="rounded-lg border px-2 py-0.5 text-xs font-black shadow-inner"
                              style={{
                                borderColor: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                color: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
                                backgroundColor: isActive ? 'rgba(212, 164, 74, 0.1)' : 'rgba(0,0,0,0.2)'
                              }}
                            >
                              {Math.round(character.ilvl)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                              <WowIcon name={classIcons[character.class] || 'inv_misc_questionmark'} size={12} />
                              {character.class}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                              <WowIcon name={roleIcons[character.gameRole] || 'inv_misc_questionmark'} size={12} />
                              {roleConfig[character.gameRole]?.label || character.gameRole}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {alts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-black text-slate-400/80 tracking-widest pl-1">
                      Personnages Secondaires
                    </div>
                    {alts.map((character) => {
                      const isActive = selectedCharacter?.id === character.id;
                      const classColor = getClassColorStyle(character.class).color || 'var(--color-primary)';

                      return (
                        <button
                          key={character.id}
                          type="button"
                          onClick={() => setSelectedCharacterId(character.id)}
                          className={`relative w-full rounded-xl border p-3 text-left transition-all duration-300 overflow-hidden ${isActive
                              ? 'border-primary/40 shadow-lg shadow-black/50 glow-gold'
                              : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                            }`}
                          style={{
                            background: isActive
                              ? `linear-gradient(90deg, ${classColor}15 0%, rgba(20, 20, 30, 0.9) 100%)`
                              : 'rgba(0, 0, 0, 0.25)'
                          }}
                        >
                          {isActive && (
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1 rounded-r-md"
                              style={{ backgroundColor: classColor }}
                            />
                          )}

                          <div className="flex items-center gap-3">
                            <Avatar
                              className="h-10 w-10 ring-1 transition-all duration-300"
                              style={{
                                borderColor: isActive ? classColor : 'rgba(255,255,255,0.1)',
                                boxShadow: isActive ? `0 0 10px ${classColor}50` : 'none'
                              }}
                            >
                              <AvatarImage src={character.avatarUrl || undefined} alt={`Avatar de ${character.name}`} />
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {getCharacterInitials(character.name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold tracking-wide uppercase transition-colors" style={{ color: classColor }}>
                                {character.name}
                              </p>
                              <p className="truncate text-[10px] uppercase font-bold text-slate-400">
                                {character.realm || 'Royaume inconnu'}
                              </p>
                            </div>

                            <span
                              className="rounded-lg border px-2 py-0.5 text-xs font-black shadow-inner"
                              style={{
                                borderColor: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                color: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)',
                                backgroundColor: isActive ? 'rgba(212, 164, 74, 0.1)' : 'rgba(0,0,0,0.2)'
                              }}
                            >
                              {Math.round(character.ilvl)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                              <WowIcon name={classIcons[character.class] || 'inv_misc_questionmark'} size={12} />
                              {character.class}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                              <WowIcon name={roleIcons[character.gameRole] || 'inv_misc_questionmark'} size={12} />
                              {roleConfig[character.gameRole]?.label || character.gameRole}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        <SyncMissingCharactersModal
          open={syncModalOpen}
          onOpenChange={setSyncModalOpen}
          onImported={handleImportedCharacters}
        />

        {syncToastMessage ? (
          <div className="fixed bottom-5 right-5 z-50 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-200 shadow-lg backdrop-blur">
            {syncToastMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}

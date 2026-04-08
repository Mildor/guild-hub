import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  useGetMyCharacters,
  useSyncCharacters,
  useSetMainCharacter,
  useSetRosterCharacter,
  useGetAllEvents as useGetEvents,
  useGetEvent,
  type EventAttendance,
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
  const { data: characters, isLoading, error } = useGetMyCharacters(user?.userId);
  const { data: events } = useGetEvents();
  const syncMutation = useSyncCharacters(user?.userId);
  const setMainMutation = useSetMainCharacter(user?.userId);
  const setRosterMutation = useSetRosterCharacter(user?.userId);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

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

    const rosterCharacter = characters.find((character) => character.isRoster);
    if (rosterCharacter) {
      return rosterCharacter;
    }

    return characters[0];
  }, [characters]);

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

  const myNextEventAttendance = useMemo((): EventAttendance | undefined => {
    if (!nextEventDetail || !user?.userId) {
      return undefined;
    }

    return nextEventDetail.attendances.find((attendance) => attendance.userId === user.userId);
  }, [nextEventDetail, user?.userId]);

  const isRegisteredToNextEvent =
    !!myNextEventAttendance && myNextEventAttendance.status !== 'DECLINED';

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
                Prochain Evenement
              </p>

              {!nextEvent ? (
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
                    <div className="inline-flex w-fit rounded-md border border-emerald-500/40 bg-emerald-600/15 px-3 py-1.5 text-sm font-medium text-emerald-300">
                      Inscrit en tant que {roleLabelMap[myNextEventAttendance?.character?.gameRole || 'DPS']} {myNextEventAttendance?.character?.name ? `(${myNextEventAttendance.character.name})` : ''}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-md border border-orange-500/40 bg-orange-600/15 px-3 py-1.5 text-sm font-medium text-orange-300">
                        Non inscrit
                      </span>
                      <Link
                        to={`/events/${nextEvent.id}`}
                        className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
                      >
                        Gerer ma presence
                      </Link>
                    </div>
                  )}
                </>
              )}
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

                          {selectedCharacter.isRoster ? (
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

                          <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                            iLvl {Math.round(selectedCharacter.ilvl)}
                          </span>
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
                        {character.isRoster ? (
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

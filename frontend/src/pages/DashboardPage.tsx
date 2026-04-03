import { useMemo, useState } from 'react';
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  useGetMyCharacters,
  useSyncCharacters,
  useSetMainCharacter,
  useGetAllEvents as useGetEvents,
  useGetEvent,
  type EventAttendance,
} from '@/api/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { WowIcon } from '@/components/ui/WowIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { classIcons, roleIcons } from '@/lib/wowData';
import { getClassColorStyle } from '@/lib/wowColors';
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

const getClassAvatarStyles = (className?: string): { bg: string; text: string } => {
  const normalized = (className || '').toLowerCase();

  if (normalized.includes('mage')) return { bg: 'bg-sky-900/30', text: 'text-sky-400' };
  if (normalized.includes('warrior')) return { bg: 'bg-orange-900/30', text: 'text-orange-400' };
  if (normalized.includes('paladin')) return { bg: 'bg-pink-900/30', text: 'text-pink-400' };
  if (normalized.includes('hunter')) return { bg: 'bg-green-900/30', text: 'text-green-400' };
  if (normalized.includes('rogue')) return { bg: 'bg-yellow-900/30', text: 'text-yellow-400' };
  if (normalized.includes('priest')) return { bg: 'bg-zinc-700/40', text: 'text-zinc-100' };
  if (normalized.includes('death')) return { bg: 'bg-red-950/40', text: 'text-red-400' };
  if (normalized.includes('shaman')) return { bg: 'bg-indigo-900/30', text: 'text-indigo-400' };
  if (normalized.includes('warlock')) return { bg: 'bg-violet-900/30', text: 'text-violet-400' };
  if (normalized.includes('monk')) return { bg: 'bg-emerald-900/30', text: 'text-emerald-400' };
  if (normalized.includes('druid')) return { bg: 'bg-amber-900/30', text: 'text-amber-500' };
  if (normalized.includes('demon')) return { bg: 'bg-fuchsia-900/30', text: 'text-fuchsia-400' };
  if (normalized.includes('evoker')) return { bg: 'bg-teal-900/30', text: 'text-teal-400' };

  return { bg: 'bg-amber-900/30', text: 'text-amber-500' };
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
  const [expandedCharacterId, setExpandedCharacterId] = useState<string | null>(null);

  if (error) {
    console.error('❌ Erreur API:', error);
  }

  const toggleRow = (id: string) => {
    setExpandedCharacterId((prev) => (prev === id ? null : id));
  };

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

    return characters.reduce((best, current) => {
      const bestIlvl =
        typeof (best as { averageItemLevel?: number }).averageItemLevel === 'number'
          ? (best as { averageItemLevel: number }).averageItemLevel
          : best.ilvl;
      const currentIlvl =
        typeof (current as { averageItemLevel?: number }).averageItemLevel === 'number'
          ? (current as { averageItemLevel: number }).averageItemLevel
          : current.ilvl;

      return currentIlvl > bestIlvl ? current : best;
    });
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="animate-fade-in-up flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-5">
              Mes Personnages
            </h1>
            <p className="text-muted-foreground">
              Gérez et consultez tous vos personnages World of Warcraft
            </p>
            <p className="text-muted-foreground">
              Vôtre personnage définit en Main sera celui utilisé par défaut dans les autres sections du site (roster, raids, etc).
            </p>
            <p className="text-muted-foreground">
              Vous pouvez synchroniser vos personnages à tout moment pour mettre à jour leurs informations et équipements.
            </p>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
            />
            {syncMutation.isPending ? 'Synchronisation...' : 'Synchroniser'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />

            {mainCharacter?.avatarUrl ? (
              <img
                src={mainCharacter.avatarUrl}
                alt={`Avatar de ${mainCharacter.name}`}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-700"
              />
            ) : (
              <div
                className={`h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold ${getClassAvatarStyles(mainCharacter?.class).bg} ${getClassAvatarStyles(mainCharacter?.class).text}`}
              >
                {getCharacterInitials(mainCharacter?.name || '?')}
              </div>
            )}

            <div className="relative z-10 min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-1">
                Personnage Principal
              </p>
              {mainCharacter ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-100 truncate">
                    {mainCharacter.name}
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    {mainCharacter.class} - {mainCharacter.activeSpec || 'Specialisation inconnue'}
                  </p>
                  <span className="inline-flex mt-3 bg-amber-600/20 text-amber-500 px-2 py-1 rounded text-sm font-semibold">
                    iLvl {mainCharacter.ilvl}
                  </span>
                </>
              ) : (
                <p className="text-slate-400 text-sm">
                  Aucun personnage disponible pour le moment.
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">
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
                <p className="text-slate-300 text-sm mt-1 mb-4">
                  {formatUpcomingEventDate(nextEvent.eventDate)}
                </p>

                {isRegisteredToNextEvent ? (
                  <div className="inline-flex w-fit rounded-md border border-emerald-500/40 bg-emerald-600/15 text-emerald-300 px-3 py-1.5 text-sm font-medium">
                    Inscrit en tant que {roleLabelMap[myNextEventAttendance?.character?.gameRole || 'DPS']} {myNextEventAttendance?.character?.name ? `(${myNextEventAttendance.character.name})` : ''}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex rounded-md border border-orange-500/40 bg-orange-600/15 text-orange-300 px-3 py-1.5 text-sm font-medium">
                      Non inscrit
                    </span>
                    <Link
                      to={`/events/${nextEvent.id}`}
                      className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      Gerer ma presence
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Characters Table */}
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
            <div className="space-y-4">
              <Alert className="border-dashed bg-card/50 border-border/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Aucun personnage trouvé. Synchronisez vos personnages avec votre compte Battle.net.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                variant="default"
                className="w-full flex items-center gap-2 justify-center"
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                />
                {syncMutation.isPending ? 'Synchronisation...' : 'Synchroniser mes personnages'}
              </Button>
            </div>
          ) : (
            <div className="border border-border/50 rounded-lg overflow-hidden bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-colors">
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground w-32">Nom</TableHead>
                    <TableHead className="font-semibold text-foreground w-32">Classe</TableHead>
                    <TableHead className="font-semibold text-foreground w-40">Spécialisation</TableHead>
                    <TableHead className="font-semibold text-foreground w-20 text-right">iLvl</TableHead>
                    <TableHead className="font-semibold text-foreground w-24 text-center">Rôle</TableHead>
                    <TableHead className="font-semibold text-foreground w-24 text-center">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charactersSorted.map((character, idx) => {
                    const isExpanded = expandedCharacterId === character.id;
                    return (
                      <React.Fragment key={character.id}>
                        <TableRow
                          className={`border-border/50 hover:bg-primary/5 transition-colors cursor-pointer ${
                            idx !== charactersSorted.length - 1 ? 'border-b' : ''
                          }`}
                          style={{
                            animation: `fade-in-up 0.3s ease-out ${idx * 0.05}s both`,
                            ...getClassColorStyle(character.class),
                          }}
                          onClick={() => toggleRow(character.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 flex-shrink-0" />
                              )}
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 ring-1 ring-border/70 shadow-sm">
                                  <AvatarImage
                                    src={character.avatarUrl || undefined}
                                    alt={`Avatar de ${character.name}`}
                                  />
                                  <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                                    {getCharacterInitials(character.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold">
                                  {character.name}
                                </span>
                                <span className="text-xs opacity-70 ml-1">
                                  {character.realm}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <WowIcon name={classIcons[character.class] || 'inv_misc_questionmark'} size={20} />
                              {character.class}
                            </div>
                          </TableCell>
                          <TableCell>
                            {character.activeSpec}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {character.ilvl}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <WowIcon name={roleIcons[character.gameRole] || 'inv_misc_questionmark'} size={20} />
                              <Badge variant={roleConfig[character.gameRole]?.variant || 'outline'}>
                                {roleConfig[character.gameRole]?.label || character.gameRole}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                !character.isMain && setMainMutation.mutate(character.id);
                              }}
                              disabled={character.isMain || setMainMutation.isPending}
                              className="cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-100"
                              title={character.isMain ? 'Personnage principal' : 'Cliquez pour définir comme principal'}
                            >
                              {character.isMain ? (
                                <Badge
                                  className="bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 dark:text-yellow-400 gap-1"
                                  style={{ color: '#FFD700' }}
                                >
                                  ⭐ Main
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="gap-1 cursor-pointer hover:bg-primary/10"
                                  style={getClassColorStyle(character.class)}
                                >
                                  Reroll
                                </Badge>
                              )}
                            </button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="border-border/50 bg-muted/20">
                            <TableCell colSpan={6} className="p-0">
                              <div className="p-6">
                                <CharacterDetailPanel data={character} />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

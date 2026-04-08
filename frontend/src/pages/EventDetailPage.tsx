import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, Users, UserCheck } from 'lucide-react';
import {
  useGetEvent,
  useGetMyCharacters,
  useUpsertAttendance,
  type AttendanceStatus,
  type EventAttendance,
} from '@/api/queries';
import { WowIcon } from '@/components/ui/WowIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { classIcons } from '@/lib/wowData';
import { getClassColorClass, ROLE_STYLES, STATUS_STYLES } from '@/lib/wowColors';
import { useAuthStore } from '@/store/authStore';
import { GameRole } from '@/types/character';

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'ACCEPTED', label: 'Présent' },
  { value: 'TENTATIVE', label: 'Incertain' },
  { value: 'LATE', label: 'En retard' },
  { value: 'DECLINED', label: 'Absent' },
];

function formatEventDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RosterGroup({ role, entries }: { role: GameRole; entries: EventAttendance[] }) {
  const roleUi = ROLE_STYLES[role];

  return (
    <Card className="bg-card/50 border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">{roleUi.title}</CardTitle>
          <Badge className={roleUi.accent}>{entries.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun joueur confirmé dans ce rôle.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((attendance) => {
              const character = attendance.character;

              return (
                <li
                  key={`${attendance.eventId}-${attendance.userId}`}
                  className="rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                >
                  {character ? (
                    <div className="flex items-center gap-3">
                      <WowIcon
                        name={classIcons[character.class] ?? 'inv_misc_questionmark'}
                        size={28}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {character.name}
                          <span className="text-muted-foreground"> - {attendance.user.battletag}</span>
                        </p>
                        <p className={`text-xs truncate ${getClassColorClass(character.class)}`}>
                          {character.class} {character.activeSpec ? `(${character.activeSpec})` : ''} -{' '}
                          {Math.round(character.ilvl)} iLvl
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">{attendance.user.battletag}</p>
                      <p className="text-xs text-muted-foreground">Personnage non renseigné</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function EventDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const { data: event, isLoading, isError } = useGetEvent(id);
  const { data: myCharacters, isLoading: isCharactersLoading } = useGetMyCharacters(authUser?.userId);
  const upsertAttendance = useUpsertAttendance();

  const myAttendance = useMemo(
    () => event?.attendances.find((attendance) => attendance.userId === authUser?.userId),
    [event?.attendances, authUser?.userId],
  );

  const [status, setStatus] = useState<AttendanceStatus>('TENTATIVE');
  const [characterId, setCharacterId] = useState('');

  useEffect(() => {
    if (!myAttendance) {
      setStatus('TENTATIVE');
      setCharacterId('');
      return;
    }

    setStatus(myAttendance.status);
    setCharacterId(myAttendance.characterId ?? '');
  }, [myAttendance]);

  const accepted = useMemo(
    () => event?.attendances.filter((attendance) => attendance.status === 'ACCEPTED') ?? [],
    [event?.attendances],
  );

  const groupedAccepted = useMemo(
    () => ({
      TANK: accepted.filter((attendance) => attendance.character?.gameRole === GameRole.TANK),
      HEALER: accepted.filter((attendance) => attendance.character?.gameRole === GameRole.HEALER),
      DPS: accepted.filter((attendance) => attendance.character?.gameRole === GameRole.DPS),
    }),
    [accepted],
  );

  const uncertain = useMemo(
    () =>
      event?.attendances.filter(
        (attendance) => attendance.status === 'DECLINED' || attendance.status === 'TENTATIVE' || attendance.status === 'LATE',
      ) ?? [],
    [event?.attendances],
  );

  const requiresCharacter = status !== 'DECLINED';
  const canSubmit = !!id && (!requiresCharacter || !!characterId);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <Skeleton className="h-[420px] lg:col-span-2" />
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card className="bg-card/40 border-border/60">
          <CardHeader>
            <CardTitle>Événement introuvable</CardTitle>
            <CardDescription>
              Cet événement n&apos;existe pas ou vous n&apos;avez pas les permissions nécessaires.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/calendar')}>
              Retour au calendrier
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate('/calendar')}>
          Retour au calendrier
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/60 border-border/60">
              <CardHeader className="min-w-0 space-y-3">
                <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <Badge variant="secondary" className="max-w-full gap-1 whitespace-normal break-words [overflow-wrap:anywhere]">
                    <CalendarClock className="size-3.5" />
                    {formatEventDate(event.eventDate)}
                  </Badge>
                  <Badge variant="outline" className="max-w-full gap-1 whitespace-normal break-words [overflow-wrap:anywhere]">
                    <Users className="size-3.5" />
                    {event.attendances.length} inscriptions
                  </Badge>
                </div>
                <CardTitle className="w-full min-w-0 break-words text-2xl md:text-3xl">
                  {event.title}
                </CardTitle>
                <CardDescription className="w-full min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base leading-relaxed text-foreground/85">
                  {event.description}
                </CardDescription>
                <p className="text-sm text-muted-foreground">Créé par {event.createdBy?.battletag ?? 'Inconnu'}</p>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Roster confirmé</h2>
                <Badge variant="outline">{accepted.length} ACCEPTED</Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <RosterGroup role={GameRole.TANK} entries={groupedAccepted.TANK} />
                <RosterGroup role={GameRole.HEALER} entries={groupedAccepted.HEALER} />
                <RosterGroup role={GameRole.DPS} entries={groupedAccepted.DPS} />
              </div>
            </div>

            <Card className="bg-card/50 border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">Absents / Incertains</CardTitle>
                <CardDescription>
                  Joueurs ayant indiqué absent, en retard ou statut provisoire.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uncertain.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun statut incertain pour le moment.</p>
                ) : (
                  <ul className="space-y-2">
                    {uncertain.map((attendance) => (
                      <li
                        key={`uncertain-${attendance.eventId}-${attendance.userId}`}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                      >
                        <p className="text-sm truncate">{attendance.user.battletag}</p>
                        <Badge className={STATUS_STYLES[attendance.status]}>{attendance.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card/60 border-border/60 sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="size-5" />
                  Mon inscription
                </CardTitle>
                <CardDescription>
                  Sélectionnez votre disponibilité et votre personnage pour cet événement.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!canSubmit) return;

                    upsertAttendance.mutate({
                      eventId: id,
                      status,
                      characterId: status === 'DECLINED' ? undefined : (characterId || undefined),
                    });
                  }}
                >
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Statut</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {STATUS_OPTIONS.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={status === option.value ? 'default' : 'outline'}
                          className="w-full justify-center"
                          onClick={() => setStatus(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {status !== 'DECLINED' ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Personnage</p>
                      <Select
                        value={characterId}
                        onChange={(eventChange) => setCharacterId(eventChange.target.value)}
                        disabled={isCharactersLoading}
                      >
                        <option value="">Choisir un personnage</option>
                        {(myCharacters ?? []).map((character) => (
                          <option key={character.id} value={character.id}>
                            {character.name} - {character.class} ({Math.round(character.ilvl)} iLvl)
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={!canSubmit || upsertAttendance.isPending}>
                    {upsertAttendance.isPending ? 'Validation...' : 'Valider mon inscription'}
                  </Button>

                  {upsertAttendance.isSuccess ? (
                    <p className="text-xs text-emerald-300">Inscription mise à jour.</p>
                  ) : null}

                  {upsertAttendance.isError ? (
                    <p className="text-xs text-rose-300">
                      Impossible d&apos;enregistrer votre inscription. Veuillez réessayer.
                    </p>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

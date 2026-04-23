import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useGetUpcomingEvents } from '@/api/queries';
import { RoleGuard } from '@/components/RoleGuard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AppRole } from '@/types/auth';

function formatEventDate(value: string) {
  const date = new Date(value);
  const datePart = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
  const timePart = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const fullDate = `${datePart}, ${timePart}`;
  return fullDate.charAt(0).toUpperCase() + fullDate.slice(1);
}

function truncateDescription(value: string, maxLength = 120) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

export function CalendarPage() {
  const { data: events, isLoading } = useGetUpcomingEvents();
  const sortedEvents = useMemo(
    () =>
      [...(events ?? [])].sort(
        (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
      ),
    [events],
  );
  const nextUpcomingEvent = useMemo(() => {
    const now = Date.now();

    return sortedEvents.reduce<(typeof sortedEvents)[number] | null>((closest, event) => {
      const eventTime = new Date(event.eventDate).getTime();

      if (eventTime < now) {
        return closest;
      }

      if (!closest) {
        return event;
      }

      const closestTime = new Date(closest.eventDate).getTime();
      return eventTime < closestTime ? event : closest;
    }, null);
  }, [sortedEvents]);
  const regularEvents = useMemo(
    () => sortedEvents.filter((event) => event.id !== nextUpcomingEvent?.id),
    [sortedEvents, nextUpcomingEvent],
  );

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent md:text-3xl">
              Calendrier de Guilde
            </h1>
            <p className="text-muted-foreground">
              Les prochains raids et événements de la semaine.
            </p>
          </div>

          <RoleGuard allowedRoles={[AppRole.ADMIN, AppRole.OFFICER]}>
            <CreateEventDialog />
          </RoleGuard>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : null}

        {!isLoading && sortedEvents.length === 0 ? (
          <Card className="bg-card/40 border-border/60">
            <CardHeader>
              <CardTitle>Aucun événement à venir</CardTitle>
              <CardDescription>
                Les officiers peuvent créer le prochain raid avec le bouton en haut à droite.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {!isLoading && sortedEvents.length > 0 ? (
          <div className="space-y-4">
            {nextUpcomingEvent ? (
              <Card className="border-primary/60 bg-gradient-to-br from-primary/15 via-card/90 to-card/70 shadow-lg shadow-primary/10">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Badge className="bg-primary text-primary-foreground">Prochain evenement</Badge>
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {formatEventDate(nextUpcomingEvent.eventDate)}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl leading-7">{nextUpcomingEvent.title}</CardTitle>
                  <CardDescription>
                    L'evenement le plus proche a venir est mis en avant pour une inscription rapide.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {truncateDescription(nextUpcomingEvent.description, 180)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cree par: {nextUpcomingEvent.createdBy?.battletag || 'Inconnu'}
                  </p>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 border-t border-primary/30 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {nextUpcomingEvent._count?.attendances ?? 0} participant(s) inscrit(s)
                  </p>
                  <Button asChild size="sm">
                    <Link to={`/events/${nextUpcomingEvent.id}`}>Voir &amp; S'inscrire</Link>
                  </Button>
                </CardFooter>
              </Card>
            ) : null}

            {regularEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularEvents.map((event) => (
                  <Card key={event.id} className="bg-card/40 border-border/60">
                    <CardHeader>
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <CardTitle className="text-xl leading-6">{event.title}</CardTitle>
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {formatEventDate(event.eventDate)}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <p className="min-h-12 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {truncateDescription(event.description)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cree par: {event.createdBy?.battletag || 'Inconnu'}
                      </p>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 border-t border-border/60 pt-4 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {event._count?.attendances ?? 0} participant(s) inscrit(s)
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/events/${event.id}`}>Voir &amp; S'inscrire</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { FormEvent, useMemo, useState } from 'react';
import { useCreateEvent } from '@/api/queries';

export function CreateEventDialog() {
  const createEventMutation = useCreateEvent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [eventTime, setEventTime] = useState('21:00');
  const [autoInviteRoster, setAutoInviteRoster] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      !createEventMutation.isPending &&
      !!eventDay &&
      title.trim().length >= 3 &&
      description.trim().length >= 10 &&
      !!eventTime
    );
  }, [createEventMutation.isPending, eventDay, title, description, eventTime]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventDay('');
    setEventTime('21:00');
    setAutoInviteRoster(false);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!eventDay || !eventTime) {
      setFormError('Merci de selectionner une date et une heure.');
      return;
    }

    if (title.trim().length < 3) {
      setFormError('Le titre doit contenir au moins 3 caracteres.');
      return;
    }

    if (description.trim().length < 10) {
      setFormError('La description doit contenir au moins 10 caracteres.');
      return;
    }

    const [hours = 0, minutes = 0] = eventTime.split(':').map(Number);
    const dateTime = new Date(`${eventDay}T00:00:00`);
    dateTime.setHours(hours, minutes, 0, 0);

    try {
      await createEventMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        eventDate: dateTime.toISOString(),
        autoInviteRoster,
      });

      resetForm();
      setOpen(false);
    } catch {
      setFormError("Impossible de creer l'evenement. Reessaie dans un instant.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85 glow-gold"
      >
        + Créer un événement
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-2xl animate-scale-in md:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-foreground">Créer un nouvel événement</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Planifie un raid et ouvre les inscriptions de la guilde.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="event-title" className="text-sm font-medium text-foreground/90">
                  Titre
                </label>
                <input
                  id="event-title"
                  required
                  minLength={3}
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Raid Heroique - Palais des Nerubiens"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="event-day" className="text-sm font-medium text-foreground/90">
                  Jour
                </label>
                <input
                  id="event-day"
                  required
                  type="date"
                  value={eventDay}
                  onChange={(e) => setEventDay(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="event-time" className="text-sm font-medium text-foreground/90">
                  Heure
                </label>
                <input
                  id="event-time"
                  required
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="event-description" className="text-sm font-medium text-foreground/90">
                  Description
                </label>
                <textarea
                  id="event-description"
                  required
                  minLength={10}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Venez avec vos compos, on vise le clean !"
                  className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3 mt-4 p-3 bg-muted/40 border border-border rounded-lg">
                <input
                  type="checkbox"
                  id="autoInvite"
                  className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
                  checked={autoInviteRoster}
                  onChange={(e) => setAutoInviteRoster(e.target.checked)}
                />
                <label htmlFor="autoInvite" className="text-sm font-medium text-foreground/90 cursor-pointer select-none">
                  Pré-inscrire automatiquement les membres du Roster (Présent)
                </label>
              </div>

              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

              <div className="mt-6 flex w-full flex-col gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/90 transition hover:bg-muted/60 md:w-auto"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                >
                  {createEventMutation.isPending ? 'Creation...' : "Créer l'événement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

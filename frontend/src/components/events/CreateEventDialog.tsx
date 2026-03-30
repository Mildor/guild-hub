import { FormEvent, useMemo, useState } from 'react';
import { useCreateEvent } from '@/api/queries';
import { CalendarIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';


function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function CreateEventDialog() {
  const createEventMutation = useCreateEvent();
  const [open, setOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDay, setEventDay] = useState<Date | undefined>();
  const [eventTime, setEventTime] = useState('21:00');
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      !createEventMutation.isPending &&
      !!eventDay &&
      title.trim().length >= 3 &&
      description.trim().length >= 5 &&
      !!eventTime
    );
  }, [createEventMutation.isPending, eventDay, title, description, eventTime]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventDay(undefined);
    setEventTime('21:00');
    setIsDatePickerOpen(false);
    setFormError(null);
  };

  

  const handleDateSelect = (value: Date | undefined) => {
    setEventDay(value);
    if (value) {
      setIsDatePickerOpen(false);
    }
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
    const dateTime = new Date(eventDay);
    dateTime.setHours(hours, minutes, 0, 0);

    try {
      await createEventMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        eventDate: dateTime.toISOString(),
      });

      resetForm();

      wait().then(() => setOpen(false));
    } catch {
      setFormError("Impossible de creer l'evenement. Reessaie dans un instant.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2" /> Créer un événement
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouvel événement</DialogTitle>
          <DialogDescription>
            Planifie un raid et ouvre les inscriptions de la guilde.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="event-title" className="text-sm font-medium">
              Titre
            </label>
            <Input
              id="event-title"
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Raid Heroique - Palais des Nerubiens"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jour</label>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !eventDay && 'text-muted-foreground',
              )}
              onClick={() => setIsDatePickerOpen((prev) => !prev)}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {eventDay
                ? formatSelectedDate(eventDay)
                : 'Choisir une date'}
            </Button>
            {isDatePickerOpen && (
              <div className="rounded-md border p-0">
                <Calendar
                  mode="single"
                  selected={eventDay}
                  onSelect={handleDateSelect}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="event-time" className="text-sm font-medium">
              Heure
            </label>
            <Input
              id="event-time"
              required
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="event-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="event-description"
              required
              minLength={10}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Venez avec vos compos, on vise le clean !"
            />
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit}>
              {createEventMutation.isPending ? 'Creation...' : 'Créer l\'événement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

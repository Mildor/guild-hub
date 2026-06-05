import { FormEvent, useMemo, useState } from 'react';
import { useCreateEvent } from '@/api/queries';
import { WowIcon } from '@/components/ui/WowIcon';
import { Calendar, Clock, Sparkles, AlertTriangle, X, Check } from 'lucide-react';

const EVENT_PRESETS = [
  {
    id: 'raid-hc',
    label: 'Raid HC',
    icon: 'inv_helmet_06',
    defaultTitle: 'Raid Héroïque',
    defaultDescription: 'Raid Héroïque hebdomadaire de la guilde. Venez avec vos flacons, potions et runes !',
  },
  {
    id: 'raid-mythic',
    label: 'Raid MM',
    icon: 'inv_helmet_08',
    defaultTitle: 'Raid Mythique - Progression',
    defaultDescription: 'Raid Mythique progression. Présence et concentration exigées. Préparez vos stratégies !',
  },
  {
    id: 'mplus',
    label: 'Mythique+',
    icon: 'inv_relics_hourglass',
    defaultTitle: 'Soirée Clés Mythique+',
    defaultDescription: 'Push de clés et entraide pour le coffre hebdomadaire de la guilde.',
  },
  {
    id: 'pvp',
    label: 'PvP / CB',
    icon: 'spell_holy_championsbond',
    defaultTitle: 'Champs de bataille cotés',
    defaultDescription: 'Soirée PvP en guilde. Rejoignez le vocal pour la coordination !',
  },
  {
    id: 'social',
    label: 'Social',
    icon: 'inv_drink_08',
    defaultTitle: 'Événement Social / Jeux',
    defaultDescription: 'Rendez-vous à la taverne pour des mini-jeux de guilde et un moment convivial !',
  },
];

export function CreateEventDialog() {
  const createEventMutation = useCreateEvent();
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [selectedHour, setSelectedHour] = useState('20');
  const [selectedMinute, setSelectedMinute] = useState('30');
  const [autoInviteRoster, setAutoInviteRoster] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const eventTime = useMemo(() => `${selectedHour}:${selectedMinute}`, [selectedHour, selectedMinute]);

  const canSubmit = useMemo(() => {
    return (
      !createEventMutation.isPending &&
      !!eventDay &&
      title.trim().length >= 3 &&
      description.trim().length >= 10 &&
      !!eventTime
    );
  }, [createEventMutation.isPending, eventDay, title, description, eventTime]);

  const handlePresetSelect = (presetId: string) => {
    const preset = EVENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPreset(presetId);
    setTitle(preset.defaultTitle);
    setDescription(preset.defaultDescription);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventDay('');
    setSelectedHour('21');
    setSelectedMinute('00');
    setAutoInviteRoster(false);
    setSelectedPreset(null);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!eventDay || !eventTime) {
      setFormError('Merci de sélectionner une date et une heure.');
      return;
    }

    if (title.trim().length < 3) {
      setFormError('Le titre doit contenir au moins 3 caractères.');
      return;
    }

    if (description.trim().length < 10) {
      setFormError('La description doit contenir au moins 10 caractères.');
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
    } catch {
      setFormError("Impossible de créer l'événement. Réessaie dans un instant.");
    }
  };

  const raidNights = useMemo(() => {
    const list = [];
    const locale = 'fr-FR';
    
    let count = 0;
    let daysToCheck = 0;
    while (count < 4 && daysToCheck < 30) {
      const d = new Date();
      d.setDate(d.getDate() + daysToCheck);
      const dayOfWeek = d.getDay();
      
      if (dayOfWeek === 1 || dayOfWeek === 3) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        
        const dayLabel = dayOfWeek === 1 ? 'Lundi' : 'Mercredi';
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString(locale, { month: 'short' }).replace('.', '');
        
        let prefix = '';
        if (daysToCheck === 0) prefix = "Auj. ";
        else if (daysToCheck === 1) prefix = "Demain ";
        else if (daysToCheck < 7) prefix = "Ce ";
        else prefix = "Prochain ";
        
        list.push({
          dateStr,
          label: `${prefix}${dayLabel}`,
          sublabel: `${dayNum} ${monthName}`,
        });
        count++;
      }
      daysToCheck++;
    }
    return list;
  }, []);

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/85 glow-gold hover:scale-[1.02] cursor-pointer"
      >
        <Sparkles className="h-4 w-4" />
        Créer un événement
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl animate-scale-in scrollbar-guild">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header Banner */}
            <div className="mb-6 border-b border-border/60 pb-4 pr-8">
              <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span className="text-primary font-serif font-black">✦</span> Créer un événement
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Planifie une activité, un raid ou un donjon et prépare les inscriptions.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              
              {/* Presets Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modèles d'événement rapides
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {EVENT_PRESETS.map((preset) => {
                    const isSelected = selectedPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetSelect(preset.id)}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-lg border text-center transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary glow-gold'
                            : 'border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/45 hover:bg-muted/50'
                        }`}
                      >
                        <WowIcon name={preset.icon} size={28} className="mb-2 shadow-sm rounded-md" />
                        <span className="text-xs font-medium truncate w-full">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="event-title" className="text-sm font-medium text-foreground/90">
                    Titre de l'événement
                  </label>
                  <span className={`text-[11px] font-mono ${title.length < 3 ? 'text-muted-foreground' : 'text-primary'}`}>
                    {title.length}/120
                  </span>
                </div>
                <input
                  id="event-title"
                  required
                  minLength={3}
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Raid Héroïque"
                  className="w-full rounded-lg border border-border bg-background/50 px-3.5 py-2 text-foreground outline-none transition duration-150 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background"
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Date Selection */}
                <div className="space-y-2">
                  <label htmlFor="event-day" className="text-sm font-semibold text-foreground/90 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-primary/80" />
                    Date de l'événement
                  </label>
                  
                  {/* Quick day pickers */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {raidNights.map((day) => {
                      const isSelected = eventDay === day.dateStr;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => setEventDay(day.dateStr)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-center transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary glow-gold'
                              : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }`}
                        >
                          <span className="text-[11px] font-bold tracking-tight">{day.label}</span>
                          <span className="text-[10px] opacity-80 mt-0.5">{day.sublabel}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Standard date picker input */}
                  <input
                    id="event-day"
                    required
                    type="date"
                    value={eventDay}
                    onChange={(e) => setEventDay(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition duration-150 focus:border-primary focus:bg-background dark:[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer cursor-pointer"
                  />
                </div>

                {/* Time Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/90 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary/80" />
                    Heure du rassemblement
                  </label>

                  {/* Quick time pickers */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {['20:30', '20:45', '21:00', '21:15'].map((time) => {
                      const [h, m] = time.split(':');
                      const isSelected = selectedHour === h && selectedMinute === m;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            setSelectedHour(h ?? '21');
                            setSelectedMinute(m ?? '00');
                          }}
                          className={`py-1.5 px-1 rounded-md text-xs font-medium border text-center transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary glow-gold font-semibold'
                              : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdowns for hours & minutes */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <select
                        aria-label="Heures"
                        value={selectedHour}
                        onChange={(e) => setSelectedHour(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition duration-150 focus:border-primary focus:bg-background cursor-pointer"
                      >
                        {hourOptions.map((hour) => (
                          <option key={hour} value={hour} className="bg-card text-foreground">
                            {hour} h
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <select
                        aria-label="Minutes"
                        value={selectedMinute}
                        onChange={(e) => setSelectedMinute(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition duration-150 focus:border-primary focus:bg-background cursor-pointer"
                      >
                        {minuteOptions.map((minute) => (
                          <option key={minute} value={minute} className="bg-card text-foreground">
                            {minute} min
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="event-description" className="text-sm font-medium text-foreground/90">
                    Description & Instructions
                  </label>
                  <span className={`text-[11px] font-mono ${description.length < 10 ? 'text-muted-foreground' : 'text-primary'}`}>
                    {description.length}/1000
                  </span>
                </div>
                <textarea
                  id="event-description"
                  required
                  minLength={10}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Précisez les prérequis d'ilvl, flacons requis, composition attendue..."
                  className="min-h-28 w-full rounded-lg border border-border bg-background/50 px-3.5 py-2 text-foreground outline-none transition duration-150 placeholder:text-muted-foreground/40 focus:border-primary focus:bg-background"
                />
              </div>

              {/* Auto Invite Toggle Card */}
              <div 
                onClick={() => setAutoInviteRoster(!autoInviteRoster)}
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all duration-200 select-none ${
                  autoInviteRoster 
                    ? 'border-primary/60 bg-primary/5 text-foreground glow-epic' 
                    : 'border-border bg-muted/10 hover:bg-muted/20 text-muted-foreground'
                }`}
              >
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  autoInviteRoster ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'
                }`}>
                  {autoInviteRoster && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className={`text-sm font-semibold transition-colors ${autoInviteRoster ? 'text-primary' : 'text-foreground'}`}>
                    Pré-inscrire automatiquement le roster actif
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Les joueurs du roster principal seront automatiquement positionnés comme "Présent" dès la création de l'événement.
                  </p>
                </div>
              </div>

              {/* Error Display */}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm animate-in fade-in duration-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-muted/80 sm:w-auto cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-40 glow-gold hover:scale-[1.01] sm:w-auto cursor-pointer"
                >
                  {createEventMutation.isPending ? 'Création...' : "Créer l'événement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}


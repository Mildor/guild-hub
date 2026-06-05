import React from 'react';
import { useTheme, Theme, CustomColors } from '@/context/ThemeProvider';

interface ThemeOption {
  id: Theme;
  label: string;
  icon: string;
  previewClass: string;
}

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, customColors, setCustomColors } = useTheme();

  const themeOptions: ThemeOption[] = [
    {
      id: 'dark',
      label: 'Sombre',
      icon: '🌙',
      previewClass: 'bg-[#121212] border-neutral-700'
    },
    {
      id: 'light',
      label: 'Clair',
      icon: '☀️',
      previewClass: 'bg-[#ffffff] border-neutral-300'
    },
    {
      id: 'horde',
      label: 'Horde',
      icon: '🔴',
      previewClass: 'bg-[#120b0b] border-red-700'
    },
    {
      id: 'alliance',
      label: 'Alliance',
      icon: '🔵',
      previewClass: 'bg-[#0d2040] border-[#d4a44a]'
    },
    {
      id: 'custom',
      label: 'Perso',
      icon: '🎨',
      previewClass: 'bg-gradient-to-tr from-cyan-500 to-fuchsia-500 border-neutral-500'
    },
  ];

  const handleColorChange = (key: keyof CustomColors, value: string | boolean) => {
    if (setCustomColors) {
      setCustomColors({
        ...customColors,
        [key]: value,
      });
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-background/80 border border-border backdrop-blur-md max-w-[280px]">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
        Thème visuel
      </span>
      <div className="grid grid-cols-2 gap-1.5">
        {themeOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => void setTheme(opt.id)}
            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition-all duration-200 border cursor-pointer ${theme === opt.id
                ? 'border-primary bg-accent text-accent-foreground ring-1 ring-primary'
                : 'border-transparent hover:bg-muted/50 text-foreground/80'
              }`}
          >
            <span className={`w-3.5 h-3.5 rounded-full border ${opt.previewClass} flex items-center justify-center`} />
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>

      {theme === 'custom' && customColors && (
        <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-2.5 animate-scale-in">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Configuration Couleur
          </span>
          
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[10px] font-semibold text-foreground/80">
              Arrière-plan
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={customColors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-border/80 bg-transparent p-0"
                />
                <span className="text-[9px] font-mono">{customColors.background}</span>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-[10px] font-semibold text-foreground/80">
              Texte
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={customColors.foreground}
                  onChange={(e) => handleColorChange('foreground', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-border/80 bg-transparent p-0"
                />
                <span className="text-[9px] font-mono">{customColors.foreground}</span>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-[10px] font-semibold text-foreground/80">
              Cartes
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={customColors.card}
                  onChange={(e) => handleColorChange('card', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-border/80 bg-transparent p-0"
                />
                <span className="text-[9px] font-mono">{customColors.card}</span>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-[10px] font-semibold text-foreground/80">
              Texte Cartes
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={customColors.cardForeground}
                  onChange={(e) => handleColorChange('cardForeground', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-border/80 bg-transparent p-0"
                />
                <span className="text-[9px] font-mono">{customColors.cardForeground}</span>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-[10px] font-semibold text-foreground/80">
              Bordures
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={customColors.border}
                  onChange={(e) => handleColorChange('border', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-border/80 bg-transparent p-0"
                />
                <span className="text-[9px] font-mono">{customColors.border}</span>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-[10px] font-semibold text-foreground/80">
              Primaire (Accent)
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={customColors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-border/80 bg-transparent p-0"
                />
                <span className="text-[9px] font-mono">{customColors.primary}</span>
              </div>
            </label>
          </div>

          <div className="border-t border-border/40 mt-1 pt-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-foreground/80">Base Sombre (Dark Mode)</span>
            <input
              type="checkbox"
              checked={customColors.isDark}
              onChange={(e) => handleColorChange('isDark', e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default ThemeSwitcher;

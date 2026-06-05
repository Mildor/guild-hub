import { useGetModules, useUpdateModule } from "@/api/queries";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Users,
  Trophy,
  Package,
  Search,
  BarChart3,
  BookOpen,
  Sliders,
  Loader2,
} from "lucide-react";

const MODULE_ICONS: Record<string, any> = {
  calendar: Calendar,
  roster: Users,
  "guild-link": Trophy,
  members: Users,
  performances: Trophy,
  vault: Package,
  "crafter-hub": Search,
  polls: BarChart3,
  strategies: BookOpen,
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  calendar: "Affiche le calendrier des événements et de la guilde, et gère les présences.",
  roster: "Affiche la liste des membres du roster avec leurs informations de rôles et stuff.",
  "guild-link": "Affiche le classement et la progression de la guilde basés sur Raider.IO.",
  members: "Affiche la liste complète des membres avec leurs détails et professions.",
  performances: "Analyse et affiche les classements de performances Mythique+ des personnages.",
  vault: "Affiche l'état hebdomadaire des coffres (Great Vault) des personnages de la guilde.",
  "crafter-hub": "Recherche et liste les crafts et recettes disponibles chez les membres.",
  polls: "Permet aux membres de voter à des sondages et d'en voir les statistiques.",
  strategies: "Consulter ou créer des fiches stratégiques et de placement par boss.",
};

export function ModulesSection() {
  const { data: modules, isLoading, error } = useGetModules();
  const updateModuleMutation = useUpdateModule();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !modules) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Une erreur est survenue lors de la récupération des modules.
        </AlertDescription>
      </Alert>
    );
  }

  const handleToggle = async (code: string, currentStatus: boolean) => {
    try {
      await updateModuleMutation.mutateAsync({
        code,
        isActive: !currentStatus,
      });
    } catch (err) {
      console.error("Failed to toggle module status", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sliders className="h-6 w-6 text-primary" />
          Gestion des Modules
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Activez ou désactivez les fonctionnalités principales de Guild Hub. Les modules désactivés seront cachés de la navigation globale et verrouillés pour les membres.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => {
          const Icon = MODULE_ICONS[mod.code] || Sliders;
          const description = MODULE_DESCRIPTIONS[mod.code] || "Pas de description fournie.";
          const isPending = updateModuleMutation.isPending && updateModuleMutation.variables?.code === mod.code;

          return (
            <div
              key={mod.id}
              className={`relative rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 ${
                mod.isActive
                  ? "border-primary/20 hover:border-primary/40 bg-gradient-to-br from-card to-primary/5"
                  : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`rounded-xl p-3 ${
                  mod.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                  {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={mod.isActive}
                    disabled={isPending}
                    onChange={() => handleToggle(mod.code, mod.isActive)}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  {mod.name}
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    mod.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                  }`} />
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

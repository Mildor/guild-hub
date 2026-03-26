import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useGetMyCharacters, useSyncCharacters, useSetMainCharacter } from '@/api/queries';
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
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { GameRole } from '@/types/character';

// Mapping des couleurs WoW (couleurs officielles)
const classColorMap: Record<string, { style: React.CSSProperties }> = {
  'Guerrier': { style: { color: '#C69B6D' } },
  'Paladin': { style: { color: '#F48CBA' } },
  'Chasseur': { style: { color: '#ABD473' } },
  'Voleur': { style: { color: '#FFE51A' } },
  'Prêtre': { style: { color: '#FFFFFF' } },
  'Chevalier de la mort': { style: { color: '#C41F3B' } },
  'Chaman': { style: { color: '#0070DD' } },
  'Mage': { style: { color: '#3FC7EB' } },
  'Démoniste': { style: { color: '#9482CA' } },
  'Moine': { style: { color: '#00FF98' } },
  'Druide': { style: { color: '#FF8000' } },
  'Chasseur de démons': { style: { color: '#A335EE' } },
  'Evoker': { style: { color: '#33937F' } },
};

// Normaliser le nom de classe pour le lookup
const getNormalizedClass = (classStr: string): string => {
  if (!classStr) return '';
  // Si c'est "WARRIOR" en majuscules, on le convertit en "Warrior"
  return classStr
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

// Mapping des badges pour les rôles
const roleConfig: Record<GameRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  TANK: { label: '🛡️ Tank', variant: 'default' },
  HEALER: { label: '✨ Healer', variant: 'secondary' },
  DPS: { label: '⚔️ DPS', variant: 'outline' },
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
  const { data: characters, isLoading, error, refetch } = useGetMyCharacters(user?.userId);
  const syncMutation = useSyncCharacters(user?.userId);
  const setMainMutation = useSetMainCharacter(user?.userId);

  // Debug logging
  console.log('🔍 DashboardPage Debug:', {
    userId: user?.userId,
    charactersCount: characters?.length,
    isLoading,
    errorMsg: error?.message,
  });

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="animate-fade-in-up flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
              Mes Personnages
            </h1>
            <p className="text-muted-foreground">
              Gérez et consultez tous vos personnages World of Warcraft
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
                    const normalizedClass = getNormalizedClass(character.class);
                    const classColor = classColorMap[normalizedClass]?.style?.color;
                    console.log('Character:', character.name, 'Class:', character.class, 'Normalized:', normalizedClass, 'Color:', classColor);
                    return (
                    <TableRow
                      key={character.id}
                      className={`border-border/50 hover:bg-primary/5 transition-colors ${
                        idx !== charactersSorted.length - 1 ? 'border-b' : ''
                      }`}
                      style={{
                        animation: `fade-in-up 0.3s ease-out ${idx * 0.05}s both`,
                        color: classColor,
                      }}
                    >
                      <TableCell className="font-medium">
                        <span className="font-semibold">
                          {character.name}
                        </span>
                        <span className="text-xs opacity-70 ml-1">
                          {character.realm}
                        </span>
                      </TableCell>
                      <TableCell>
                        {character.class}
                      </TableCell>
                      <TableCell>
                        {character.activeSpec}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {character.ilvl}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={roleConfig[character.gameRole]?.variant || 'outline'}>
                          {roleConfig[character.gameRole]?.label || character.gameRole}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => !character.isMain && setMainMutation.mutate(character.id)}
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
                              style={{ color: classColorMap[getNormalizedClass(character.class)]?.style?.color }}
                            >
                              Reroll
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Stats */}
        {charactersSorted.length > 0 && (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            {[
              {
                label: 'Total',
                value: charactersSorted.length,
                gradient: 'from-blue-500/30 to-blue-600/30',
                textGradient: 'from-blue-400 to-blue-500',
              },
              {
                label: 'iLvl Moyen',
                value: (
                  charactersSorted.reduce((sum, c) => sum + c.ilvl, 0) /
                  charactersSorted.length
                ).toFixed(0),
                gradient: 'from-green-500/30 to-green-600/30',
                textGradient: 'from-green-400 to-green-500',
              },
              {
                label: 'Principal',
                value: charactersSorted.find((c) => c.isMain)?.name || '—',
                gradient: 'from-yellow-500/30 to-yellow-600/30',
                textGradient: 'from-yellow-400 to-yellow-500',
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg bg-gradient-to-br ${stat.gradient} border border-border/50 hover:border-primary/30 transition-all hover:bg-card/80 cursor-pointer`}
                style={{
                  animation: `fade-in-up 0.3s ease-out ${(idx + 3) * 0.1}s both`,
                }}
              >
                <p className="text-muted-foreground text-sm mb-2">{stat.label}</p>
                <p className={`text-2xl font-bold bg-gradient-to-r ${stat.textGradient} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

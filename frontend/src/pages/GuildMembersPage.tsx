import { useState, useMemo } from 'react';
import { useGetAllCharacters, type CharacterWithUser } from '@/api/queries';
import { CharacterSheetModal } from '@/components/characters/CharacterSheetModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Search } from 'lucide-react';
import { WowIcon } from '@/components/ui/WowIcon';
import { classIcons } from '@/lib/wowData';
import { getClassColorStyle } from '@/lib/wowColors';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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

export function GuildMembersPage() {
  const { data: allCharacters, isLoading, error } = useGetAllCharacters(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const charactersByClassAndSpec = useMemo<Record<string, Record<string, CharacterWithUser[]>>>(() => {
    if (!allCharacters) return {};
    
    let filtered = allCharacters;
    
    if (searchTerm.trim() !== '') {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(normalizedSearch) ||
        c.class.toLowerCase().includes(normalizedSearch) ||
        (c.user?.battletag || '').toLowerCase().includes(normalizedSearch)
      );
    }
    
    const grouped: Record<string, Record<string, CharacterWithUser[]>> = {};
  
    for (const c of filtered) {
      const cls = c.class || 'Inconnue';
      const spec = c.activeSpecName || 'Inconnue';
      
      if (!grouped[cls]) {
        grouped[cls] = {};
      }
      if (!grouped[cls][spec]) {
        grouped[cls][spec] = [];
      }
      grouped[cls][spec].push(c);
    }

    for (const cls of Object.keys(grouped)) {
      const specs = grouped[cls];
      if (!specs) continue;
      for (const spec of Object.keys(specs)) {
        const chars = specs[spec];
        if (!chars) continue;
        chars.sort((a, b) => {
          if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
          return b.ilvl - a.ilvl;
        });
      }
    }

    return grouped;
  }, [allCharacters, searchTerm]);

  const groupedSpecs = useMemo(() => {
    const list: Array<{
      className: string;
      specName: string;
      characters: CharacterWithUser[];
    }> = [];

    const sortedClasses = Object.keys(charactersByClassAndSpec).sort((a, b) => a.localeCompare(b));
    for (const cls of sortedClasses) {
      const specs = charactersByClassAndSpec[cls];
      if (!specs) continue;
      const sortedSpecs = Object.keys(specs).sort((a, b) => a.localeCompare(b));
      for (const spec of sortedSpecs) {
        const characters = specs[spec];
        if (!characters) continue;
        list.push({
          className: cls,
          specName: spec,
          characters,
        });
      }
    }
    return list;
  }, [charactersByClassAndSpec]);

  const selectedCharacter = useMemo(() => {
    if (!allCharacters || !selectedCharacterId) return null;
    return allCharacters.find(c => c.id === selectedCharacterId) ?? null;
  }, [allCharacters, selectedCharacterId]);

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Membres de la Guilde
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Consultez tous les personnages de la guilde, groupés par classe et spécialisation.
            </p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher (nom, classe, joueur)..."
              className="pl-9 bg-card/40 border-border/70 focus:bg-background/80 transition-colors rounded-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erreur lors du chargement des personnages. Veuillez réessayer.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : groupedSpecs.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-card/20 p-8 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-lg font-medium">Aucun personnage trouvé</p>
              <p className="text-sm text-muted-foreground/70">Essayez de modifier votre recherche.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6">
              {groupedSpecs.map((group) => (
                  <div key={`${group.className}-${group.specName}`} className="break-inside-avoid mb-6 rounded-xl border border-border/60 bg-card/30 p-4 shadow-sm flex flex-col hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-3">
                      <WowIcon name={classIcons[group.className] || 'inv_misc_questionmark'} size={24} />
                      <div className="flex flex-col">
                        <span style={getClassColorStyle(group.className)} className="text-sm font-bold drop-shadow-sm leading-none">
                          {group.className}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                          {group.specName}
                        </span>
                      </div>
                      <Badge variant="secondary" className="ml-auto text-[10px] bg-background/50 border-border/50">
                        {group.characters.length}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2.5 flex-1 content-start">
                      {group.characters.map(character => (
                        <div
                          key={character.id}
                          onClick={() => setSelectedCharacterId(character.id)}
                          className="group/btn cursor-pointer flex items-center gap-3 rounded-lg border border-border/40 bg-background/40 p-2 text-left hover:border-primary/50 hover:bg-background/80 hover:shadow-md transition-all duration-200"
                        >
                          <Avatar className="h-9 w-9 ring-1 ring-border/80 group-hover/btn:ring-primary/50 transition-colors">
                            <AvatarImage src={character.avatarUrl || undefined} alt={character.name} />
                            <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                              {getCharacterInitials(character.name)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="truncate text-[13px] font-bold text-foreground group-hover/btn:text-primary transition-colors">
                                {character.name}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 whitespace-nowrap shadow-sm">
                                  {Math.round(character.ilvl)}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <p className="truncate text-[10px] font-medium text-muted-foreground/80">
                                {character.user?.battletag?.split('#')[0] || 'Inconnu'}
                              </p>
                              {character.isMain && (
                                <Badge className="border border-yellow-500/30 bg-yellow-500/10 text-[8px] text-yellow-500/90 py-0 h-3.5 leading-none px-1 font-bold uppercase rounded-sm">
                                  Main
                                </Badge>
                              )}
                              {character.inRoster && (
                                <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-[8px] text-emerald-500/90 py-0 h-3.5 leading-none px-1 font-bold uppercase rounded-sm">
                                  Roster
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Modal for Character Details */}
        <CharacterSheetModal 
            character={selectedCharacter || null}
            open={!!selectedCharacterId} 
            onOpenChange={(open) => {
                if (!open) setSelectedCharacterId(null);
            }} 
        />
      </div>
    </div>
  );
}

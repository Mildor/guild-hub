import { useState, useMemo } from 'react';
import { X, RefreshCw, Search, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WowIcon } from '@/components/ui/WowIcon';
import { classIcons } from '@/lib/wowData';
import { getClassColorStyle } from '@/lib/wowColors';

interface Character {
  id: string;
  name: string;
  realm: string;
  class: string;
  avatarUrl?: string | null;
  activeSpecName?: string;
  ilvl?: number;
  gameRole?: string;
}

interface WclCharacterSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  onSync?: (characterId: string) => Promise<void> | void;
}

export function WclCharacterSyncModal({
  isOpen,
  onClose,
  characters,
  onSync,
}: WclCharacterSyncModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingStates, setSyncingStates] = useState<Record<string, boolean>>({});

  // Filter characters based on search query
  const filteredCharacters = useMemo(() => {
    return characters.filter((char) => {
      const query = searchQuery.toLowerCase();
      return (
        char.name.toLowerCase().includes(query) ||
        char.class.toLowerCase().includes(query) ||
        (char.realm && char.realm.toLowerCase().includes(query)) ||
        (char.activeSpecName && char.activeSpecName.toLowerCase().includes(query))
      );
    });
  }, [characters, searchQuery]);

  if (!isOpen) return null;

  const handleSync = async (characterId: string) => {
    setSyncingStates((prev) => ({ ...prev, [characterId]: true }));
    try {
      if (onSync) {
        await onSync(characterId);
      } else {
        // Fallback mock function with delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log(`Mock Sync triggered for character: ${characterId}`);
      }
    } catch (error) {
      console.error('Error synchronizing character:', error);
    } finally {
      setSyncingStates((prev) => ({ ...prev, [characterId]: false }));
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between bg-black/40">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Sélecteur Visuel de Synchronisation
            </h3>
            <p className="text-xs text-muted-foreground">
              Sélectionnez et synchronisez les performances d&apos;un personnage de la guilde.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="p-4 bg-zinc-900/30 border-b border-zinc-800/50 flex items-center px-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, classe ou spécialisation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>
        </div>

        {/* Characters Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/30">
          {filteredCharacters.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              Aucun personnage trouvé pour &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCharacters.map((char) => {
                const isSyncing = !!syncingStates[char.id];
                return (
                  <div
                    key={char.id}
                    className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-black/40 p-4"
                  >
                    {/* Character Info */}
                    <div className="flex flex-col items-center text-center space-y-3 mb-4">
                      <Avatar className="h-16 w-16 ring-2 ring-zinc-800 shadow-md group-hover:scale-105 transition-transform duration-300">
                        <AvatarImage src={char.avatarUrl || undefined} alt={char.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                          {getInitials(char.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1">
                        <h4 
                          className="font-bold text-sm truncate max-w-[150px] mx-auto"
                          style={getClassColorStyle(char.class)}
                        >
                          {char.name}
                        </h4>
                        <div className="flex items-center justify-center gap-1.5">
                          <WowIcon 
                            name={classIcons[char.class] || 'inv_misc_questionmark'} 
                            size={12} 
                            className="rounded-sm" 
                          />
                          <span className="text-[10px] text-zinc-400 font-semibold truncate max-w-[120px]">
                            {char.activeSpecName || char.class}
                          </span>
                        </div>
                        {char.ilvl && (
                          <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-amber-500/80 border border-zinc-750 font-bold">
                            {Math.round(char.ilvl)} iLvl
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sync Button */}
                    <button
                      onClick={() => handleSync(char.id)}
                      disabled={isSyncing}
                      className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-amber-400 hover:bg-zinc-900 hover:border-zinc-700 disabled:opacity-50 disabled:hover:text-zinc-300 disabled:hover:bg-zinc-950 disabled:hover:border-zinc-800 transition-all text-xs font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-500' : ''}`} />
                      {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-black/40 flex items-center justify-between text-[11px] text-zinc-500 px-6">
          <span>{filteredCharacters.length} personnages disponibles</span>
          <span>{searchQuery ? `Filtre actif: "${searchQuery}"` : ''}</span>
        </div>

      </div>
    </div>
  );
}

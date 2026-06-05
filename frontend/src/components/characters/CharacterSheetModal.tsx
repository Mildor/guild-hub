import { ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GuildCharacterSheet } from "@/components/characters/GuildCharacterSheet";
import { type CharacterWithUser } from "@/api/queries";
import { type Character } from "@/types/character";

interface CharacterSheetModalProps {
    character: CharacterWithUser | Character | null;
    children?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function CharacterSheetModal({ character, children, open, onOpenChange }: CharacterSheetModalProps) {
    if (!character && !children) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && (
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
            )}
            <DialogContent className="max-w-5xl w-[85vw] h-[80vh] bg-background border-2 border-white/30 p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] rounded-3xl flex flex-col ring-4 ring-black/50">
                <DialogTitle className="sr-only">
                    Détails de {character?.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Fiche de personnage complète.
                </DialogDescription>
                
                {character && (
                    <div className="flex-1 w-full relative flex flex-col min-h-0">
                        <GuildCharacterSheet data={character} />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

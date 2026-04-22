import { useMemo, useState } from "react";
import {
    useAdminSyncCharacter,
    useCreateCharacter,
    useDeleteCharacter,
    useGetAllCharacters,
    useGetAllUsers,
    useToggleRoster,
    useUpdateCharacter,
    useSyncAllCharacters,
} from "@/api/queries";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Plus,
    Search,
    RefreshCcw,
    Pencil,
    Trash2,
    Save,
    X,
    UserSquare2,
    ShieldAlert,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getClassColorClass } from "@/lib/wowColors";
import { gameRoles } from "../adminUtils";

export function CharactersSection() {
    const { data: users = [], isLoading: isUsersLoading } = useGetAllUsers();
    const { data: characters = [], isLoading: isCharactersLoading } =
        useGetAllCharacters();

    const createCharacterMutation = useCreateCharacter();
    const updateCharacterMutation = useUpdateCharacter();
    const deleteCharacterMutation = useDeleteCharacter();
    const toggleRosterMutation = useToggleRoster();
    const adminSyncCharacterMutation = useAdminSyncCharacter();
    const syncAllMutation = useSyncAllCharacters();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<any | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [characterToDelete, setCharacterToDelete] = useState<any | null>(
        null,
    );

    const [query, setQuery] = useState("");
    const [editForm, setEditForm] = useState({
        ilvl: "",
        activeSpec: "",
        gameRole: "DPS" as "TANK" | "HEALER" | "DPS",
    });
    const [syncFeedback, setSyncFeedback] = useState<
        Record<string, { type: "success" | "error"; message: string }>
    >({});

    const emptyCreateForm = {
        userId: "",
        name: "",
        realm: "",
        class: "",
        activeSpec: "",
        gameRole: "DPS" as "TANK" | "HEALER" | "DPS",
    };
    const [createForm, setCreateForm] = useState(emptyCreateForm);

    const filteredCharacters = useMemo(() => {
        const search = query.trim().toLowerCase();
        return characters.filter((character) => {
            return (
                character.name.toLowerCase().includes(search) ||
                character.user?.battletag?.toLowerCase().includes(search)
            );
        });
    }, [characters, query]);

    if (isUsersLoading || isCharactersLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Personnages
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Gérez les personnages liés aux utilisateurs et le
                        roster.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={syncAllMutation.isPending}
                        onClick={() => {
                            if (
                                window.confirm(
                                    "Voulez-vous synchroniser tous les personnages du roster via Blizzard ? Cela peut prendre quelques instants.",
                                )
                            ) {
                                syncAllMutation.mutate();
                            }
                        }}
                    >
                        <RefreshCcw
                            className={`h-4 w-4 ${syncAllMutation.isPending ? "animate-spin" : ""}`}
                        />
                        {syncAllMutation.isPending
                            ? "Synchronisation..."
                            : "Synchroniser tout"}
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                            setCreateForm(emptyCreateForm);
                            setIsAddModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Ajouter manuellement
                    </Button>
                </div>
            </div>

            {/* List with Search */}
            <div className="space-y-4">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher par nom ou BattleTag..."
                        className="pl-10"
                    />
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-semibold">
                                    Joueur
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Personnage
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Classe
                                </TableHead>
                                <TableHead className="font-semibold">
                                    iLvl
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Spé
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Rôle
                                </TableHead>
                                <TableHead className="font-semibold text-center">
                                    Roster
                                </TableHead>
                                <TableHead className="text-right font-semibold">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCharacters.map((character) => {
                                const feedback = syncFeedback[character.id];
                                const isSyncing =
                                    adminSyncCharacterMutation.isPending &&
                                    adminSyncCharacterMutation.variables ===
                                        character.id;

                                return (
                                    <TableRow
                                        key={character.id}
                                        className="hover:bg-accent/5 transition-colors"
                                    >
                                        <TableCell className="font-medium text-xs truncate max-w-[120px]">
                                            {character.user?.battletag ||
                                                "Inconnu"}
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {character.name}
                                        </TableCell>
                                        <TableCell
                                            className={getClassColorClass(
                                                character.class,
                                            )}
                                        >
                                            {character.class}
                                        </TableCell>
                                        <TableCell>
                                            {Math.round(character.ilvl)}
                                        </TableCell>
                                        <TableCell>
                                            {character.activeSpec}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] uppercase"
                                            >
                                                {character.gameRole}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                onClick={() =>
                                                    toggleRosterMutation.mutate(
                                                        {
                                                            id: character.id,
                                                            inRoster:
                                                                !character.inRoster,
                                                        },
                                                    )
                                                }
                                                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${
                                                    character.inRoster
                                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 scale-105"
                                                        : "bg-muted text-muted-foreground hover:bg-muted/80 opacity-60"
                                                }`}
                                            >
                                                {character.inRoster
                                                    ? "Oui"
                                                    : "Non"}
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Resynchroniser Blizzard"
                                                    disabled={isSyncing}
                                                    onClick={() =>
                                                        adminSyncCharacterMutation.mutate(
                                                            character.id,
                                                            {
                                                                onSuccess: () =>
                                                                    setSyncFeedback(
                                                                        (
                                                                            p,
                                                                        ) => ({
                                                                            ...p,
                                                                            [character.id]:
                                                                                {
                                                                                    type: "success",
                                                                                    message:
                                                                                        "OK",
                                                                                },
                                                                        }),
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    className={
                                                        isSyncing
                                                            ? "animate-spin"
                                                            : feedback?.type ===
                                                                "success"
                                                              ? "text-emerald-500"
                                                              : ""
                                                    }
                                                >
                                                    <RefreshCcw className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Modifier"
                                                    onClick={() => {
                                                        setEditingCharacter(
                                                            character,
                                                        );
                                                        setEditForm({
                                                            ilvl: String(
                                                                Math.round(
                                                                    character.ilvl,
                                                                ),
                                                            ),
                                                            activeSpec:
                                                                character.activeSpec,
                                                            gameRole:
                                                                character.gameRole,
                                                        });
                                                        setIsEditModalOpen(
                                                            true,
                                                        );
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        setCharacterToDelete(
                                                            character,
                                                        );
                                                        setIsDeleteDialogOpen(
                                                            true,
                                                        );
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Add Character Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Ajouter un personnage manuellement
                        </DialogTitle>
                        <DialogDescription>
                            Remplissez les informations pour lier un personnage
                            à un profil.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Utilisateur
                            </label>
                            <Select
                                value={createForm.userId}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        userId: e.target.value,
                                    }))
                                }
                            >
                                <option value="">Choisir...</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.battletag}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Nom
                            </label>
                            <Input
                                value={createForm.name}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        name: e.target.value,
                                    }))
                                }
                                placeholder="Nom"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Royaume
                            </label>
                            <Input
                                value={createForm.realm}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        realm: e.target.value,
                                    }))
                                }
                                placeholder="Ex: Hyjal"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Classe
                            </label>
                            <Input
                                value={createForm.class}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        class: e.target.value,
                                    }))
                                }
                                placeholder="Ex: Mage"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Spécialisation
                            </label>
                            <Input
                                value={createForm.activeSpec}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        activeSpec: e.target.value,
                                    }))
                                }
                                placeholder="Ex: Givre"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Rôle
                            </label>
                            <Select
                                value={createForm.gameRole}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        gameRole: e.target.value as any,
                                    }))
                                }
                            >
                                {gameRoles.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={() => {
                                if (
                                    !createForm.userId ||
                                    !createForm.name ||
                                    !createForm.realm
                                )
                                    return;
                                createCharacterMutation.mutate(createForm, {
                                    onSuccess: () => setIsAddModalOpen(false),
                                });
                            }}
                            disabled={createCharacterMutation.isPending}
                        >
                            {createCharacterMutation.isPending
                                ? "Création..."
                                : "Ajouter le personnage"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Character Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Modifier {editingCharacter?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                iLvl
                            </label>
                            <Input
                                type="number"
                                value={editForm.ilvl}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        ilvl: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Spécialisation
                            </label>
                            <Input
                                value={editForm.activeSpec}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        activeSpec: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Rôle
                            </label>
                            <Select
                                value={editForm.gameRole}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        gameRole: e.target.value as any,
                                    }))
                                }
                            >
                                {gameRoles.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={() => {
                                if (editingCharacter) {
                                    updateCharacterMutation.mutate(
                                        {
                                            id: editingCharacter.id,
                                            payload: {
                                                ilvl: Number(editForm.ilvl),
                                                activeSpec: editForm.activeSpec,
                                                gameRole: editForm.gameRole,
                                            },
                                        },
                                        {
                                            onSuccess: () =>
                                                setIsEditModalOpen(false),
                                        },
                                    );
                                }
                            }}
                            disabled={updateCharacterMutation.isPending}
                        >
                            {updateCharacterMutation.isPending
                                ? "Mise à jour..."
                                : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                            Supprimer le personnage
                        </DialogTitle>
                        <DialogDescription>
                            Voulez-vous vraiment supprimer{" "}
                            <span className="font-bold">
                                {characterToDelete?.name}
                            </span>{" "}
                            ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (characterToDelete) {
                                    deleteCharacterMutation.mutate(
                                        characterToDelete.id,
                                        {
                                            onSuccess: () =>
                                                setIsDeleteDialogOpen(false),
                                        },
                                    );
                                }
                            }}
                            disabled={deleteCharacterMutation.isPending}
                        >
                            {deleteCharacterMutation.isPending
                                ? "Suppression..."
                                : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

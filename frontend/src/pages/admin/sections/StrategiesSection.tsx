import { useState } from "react";
import {
    useCreateStrategy,
    useDeleteStrategy,
    useGetStrategies,
    useUpdateStrategy,
} from "@/api/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Pencil,
    Trash2,
    Swords,
    Upload,
    ShieldAlert,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

export function StrategiesSection() {
    const { data: strategies = [], isLoading } = useGetStrategies();
    const createStrategyMutation = useCreateStrategy();
    const updateStrategyMutation = useUpdateStrategy();
    const deleteStrategyMutation = useDeleteStrategy();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStrategy, setEditingStrategy] = useState<any | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [strategyToDelete, setStrategyToDelete] = useState<any | null>(null);

    const emptyForm = {
        bossName: "",
        raidName: "",
        positioningImageUrl: "",
        generalMechanics: "",
        tankNotes: "",
        healerNotes: "",
        dpsNotes: "",
        imageFile: null as File | null,
    };

    const [createForm, setCreateForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyForm);
    const [createPreview, setCreatePreview] = useState<string | null>(null);
    const [editPreview, setEditPreview] = useState<string | null>(null);

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        isEdit: boolean,
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            if (isEdit) {
                setEditForm((p) => ({ ...p, imageFile: file }));
                setEditPreview(URL.createObjectURL(file));
            } else {
                setCreateForm((p) => ({ ...p, imageFile: file }));
                setCreatePreview(URL.createObjectURL(file));
            }
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Stratégies
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Rédigez les guides de combats pour la guilde.
                    </p>
                </div>
                <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                        setCreateForm(emptyForm);
                        setCreatePreview(null);
                        setIsAddModalOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4" />
                    Ajouter une stratégie
                </Button>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {strategies.map((strategy) => (
                    <div
                        key={strategy.id}
                        className="rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/20"
                    >
                        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                    <Swords className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                        {strategy.raidName}
                                    </p>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {strategy.bossName}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Modifier"
                                    onClick={() => {
                                        setEditingStrategy(strategy);
                                        setEditForm({
                                            raidName: strategy.raidName,
                                            bossName: strategy.bossName,
                                            positioningImageUrl:
                                                strategy.positioningImageUrl ||
                                                "",
                                            generalMechanics:
                                                strategy.generalMechanics,
                                            tankNotes: strategy.tankNotes || "",
                                            healerNotes:
                                                strategy.healerNotes || "",
                                            dpsNotes: strategy.dpsNotes || "",
                                            imageFile: null,
                                        });
                                        setEditPreview(
                                            strategy.positioningImageUrl ||
                                                null,
                                        );
                                        setIsEditModalOpen(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                        setStrategyToDelete(strategy);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                                {strategy.generalMechanics}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Strategy Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Ajouter une stratégie
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Raid
                            </label>
                            <Input
                                value={createForm.raidName}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        raidName: e.target.value,
                                    }))
                                }
                                placeholder="Nom du raid"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Boss
                            </label>
                            <Input
                                value={createForm.bossName}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        bossName: e.target.value,
                                    }))
                                }
                                placeholder="Nom du boss"
                            />
                        </div>
                        <div className="md:col-span-2 border-y border-border/50 py-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4 text-primary" />
                                <span className="text-xs font-bold uppercase text-muted-foreground">
                                    Image de placement
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, false)}
                                    className="flex-1"
                                />
                                {createPreview && (
                                    <div className="h-12 w-12 rounded border border-border overflow-hidden">
                                        <img
                                            src={createPreview}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                            <Input
                                value={createForm.positioningImageUrl}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        positioningImageUrl: e.target.value,
                                    }))
                                }
                                placeholder="Ou URL directe de l'image"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Mécaniques Générales
                            </label>
                            <Textarea
                                value={createForm.generalMechanics}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        generalMechanics: e.target.value,
                                    }))
                                }
                                placeholder="Expliquez le combat..."
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 text-blue-400">
                                Notes Healer
                            </label>
                            <Textarea
                                value={createForm.healerNotes}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        healerNotes: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 text-red-400">
                                Notes Tank
                            </label>
                            <Textarea
                                value={createForm.tankNotes}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        tankNotes: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 text-orange-400">
                                Notes DPS
                            </label>
                            <Textarea
                                value={createForm.dpsNotes}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        dpsNotes: e.target.value,
                                    }))
                                }
                            />
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
                                    !createForm.raidName ||
                                    !createForm.bossName ||
                                    !createForm.generalMechanics
                                )
                                    return;
                                createStrategyMutation.mutate(
                                    {
                                        ...createForm,
                                        positioningImageUrl:
                                            createForm.positioningImageUrl ||
                                            undefined,
                                        tankNotes:
                                            createForm.tankNotes || undefined,
                                        healerNotes:
                                            createForm.healerNotes || undefined,
                                        dpsNotes:
                                            createForm.dpsNotes || undefined,
                                        imageFile:
                                            createForm.imageFile || undefined,
                                    },
                                    {
                                        onSuccess: () =>
                                            setIsAddModalOpen(false),
                                    },
                                );
                            }}
                            disabled={createStrategyMutation.isPending}
                        >
                            {createStrategyMutation.isPending
                                ? "Création..."
                                : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Strategy Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Modifier la stratégie
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Raid
                            </label>
                            <Input
                                value={editForm.raidName}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        raidName: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Boss
                            </label>
                            <Input
                                value={editForm.bossName}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        bossName: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="md:col-span-2 border-y border-border/50 py-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4 text-primary" />
                                <span className="text-xs font-bold uppercase text-muted-foreground">
                                    Image de placement
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, true)}
                                    className="flex-1"
                                />
                                {editPreview && (
                                    <div className="h-12 w-12 rounded border border-border overflow-hidden">
                                        <img
                                            src={editPreview}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                            <Input
                                value={editForm.positioningImageUrl}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        positioningImageUrl: e.target.value,
                                    }))
                                }
                                placeholder="URL de l'image"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Mécaniques Générales
                            </label>
                            <Textarea
                                value={editForm.generalMechanics}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        generalMechanics: e.target.value,
                                    }))
                                }
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 text-blue-400">
                                Notes Healer
                            </label>
                            <Textarea
                                value={editForm.healerNotes}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        healerNotes: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 text-red-400">
                                Notes Tank
                            </label>
                            <Textarea
                                value={editForm.tankNotes}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        tankNotes: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1 text-orange-400">
                                Notes DPS
                            </label>
                            <Textarea
                                value={editForm.dpsNotes}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        dpsNotes: e.target.value,
                                    }))
                                }
                            />
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
                                if (editingStrategy) {
                                    updateStrategyMutation.mutate(
                                        {
                                            id: editingStrategy.id,
                                            ...editForm,
                                            positioningImageUrl:
                                                editForm.positioningImageUrl ||
                                                undefined,
                                            tankNotes:
                                                editForm.tankNotes || undefined,
                                            healerNotes:
                                                editForm.healerNotes ||
                                                undefined,
                                            dpsNotes:
                                                editForm.dpsNotes || undefined,
                                            imageFile:
                                                editForm.imageFile || undefined,
                                        },
                                        {
                                            onSuccess: () =>
                                                setIsEditModalOpen(false),
                                        },
                                    );
                                }
                            }}
                            disabled={updateStrategyMutation.isPending}
                        >
                            {updateStrategyMutation.isPending
                                ? "Mise à jour..."
                                : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                            Supprimer la stratégie
                        </DialogTitle>
                        <DialogDescription>
                            Voulez-vous vraiment supprimer la stratégie pour{" "}
                            <span className="font-bold">
                                {strategyToDelete?.bossName}
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
                                if (strategyToDelete) {
                                    deleteStrategyMutation.mutate(
                                        strategyToDelete.id,
                                        {
                                            onSuccess: () =>
                                                setIsDeleteDialogOpen(false),
                                        },
                                    );
                                }
                            }}
                            disabled={deleteStrategyMutation.isPending}
                        >
                            {deleteStrategyMutation.isPending
                                ? "Suppression..."
                                : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

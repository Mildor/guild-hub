import { useState } from "react";
import {
    useCreatePoll,
    useDeletePoll,
    useGetPolls,
    useTogglePoll,
    useUpdatePoll,
} from "@/api/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Pencil,
    Trash2,
    Save,
    X,
    BarChart3,
    ShieldAlert,
    Clock,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";

export function PollsSection() {
    const { data: polls = [], isLoading } = useGetPolls();
    const createPollMutation = useCreatePoll();
    const updatePollMutation = useUpdatePoll();
    const togglePollMutation = useTogglePoll();
    const deletePollMutation = useDeletePoll();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPoll, setEditingPoll] = useState<any | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [pollToDelete, setPollToDelete] = useState<any | null>(null);

    const emptyForm = {
        question: "",
        description: "",
        options: "",
        allowMultipleSelections: false,
    };
    const [createForm, setCreateForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyForm);

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
                        Sondages
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Gérez les sondages et les votes de la guilde.
                    </p>
                </div>
                <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                        setCreateForm(emptyForm);
                        setIsAddModalOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4" />
                    Lancer un sondage
                </Button>
            </div>

            {/* List */}
            <div className="grid gap-6">
                {polls.map((poll) => (
                    <div
                        key={poll.id}
                        className="rounded-2xl border border-border bg-card p-6 transition-all hover:bg-muted/30"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {!poll.isActive && (
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] uppercase font-bold"
                                        >
                                            Clos
                                        </Badge>
                                    )}
                                    <h3 className="text-lg font-bold text-foreground">
                                        {poll.question}
                                    </h3>
                                </div>
                                {poll.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {poll.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2 self-end md:self-auto">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title={
                                        poll.isActive
                                            ? "Fermer le sondage"
                                            : "Réouvrir le sondage"
                                    }
                                    disabled={togglePollMutation.isPending}
                                    onClick={() =>
                                        togglePollMutation.mutate(poll.id)
                                    }
                                >
                                    <BarChart3 className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Modifier"
                                    onClick={() => {
                                        setEditingPoll(poll);
                                        setEditForm({
                                            question: poll.question,
                                            description: poll.description || "",
                                            options: poll.options
                                                .map((o) => o.text)
                                                .join("\n"),
                                            allowMultipleSelections:
                                                poll.allowMultipleSelections,
                                        });
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
                                        setPollToDelete(poll);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {poll.options.map((option) => {
                                const votes = poll.votes.filter(
                                    (v) => v.optionId === option.id,
                                ).length;
                                return (
                                    <div
                                        key={option.id}
                                        className="rounded-lg border border-border/50 bg-background/50 p-3 text-xs flex justify-between items-center group hover:border-primary/30 transition-colors"
                                    >
                                        <span className="font-medium text-foreground">
                                            {option.text}
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="font-mono"
                                        >
                                            {votes} votes
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Poll Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Créer un sondage
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Question
                            </label>
                            <Input
                                value={createForm.question}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        question: e.target.value,
                                    }))
                                }
                                placeholder="La question du sondage"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Description
                            </label>
                            <Textarea
                                value={createForm.description}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        description: e.target.value,
                                    }))
                                }
                                placeholder="Détails optionnels"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Options (une par ligne)
                            </label>
                            <Textarea
                                value={createForm.options}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        options: e.target.value,
                                    }))
                                }
                                placeholder="Option A\nOption B"
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="create-multi"
                                checked={createForm.allowMultipleSelections}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        allowMultipleSelections:
                                            e.target.checked,
                                    }))
                                }
                            />
                            <label htmlFor="create-multi" className="text-sm">
                                Autoriser plusieurs choix
                            </label>
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
                                const options = createForm.options
                                    .split("\n")
                                    .map((o) => o.trim())
                                    .filter(Boolean);
                                if (!createForm.question || options.length < 2)
                                    return;
                                createPollMutation.mutate(
                                    {
                                        ...createForm,
                                        options,
                                    },
                                    {
                                        onSuccess: () =>
                                            setIsAddModalOpen(false),
                                    },
                                );
                            }}
                            disabled={createPollMutation.isPending}
                        >
                            {createPollMutation.isPending
                                ? "Création..."
                                : "Lancer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Poll Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Modifier le sondage
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Question
                            </label>
                            <Input
                                value={editForm.question}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        question: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Description
                            </label>
                            <Textarea
                                value={editForm.description}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        description: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Options (Attention: redéfinit tout)
                            </label>
                            <Textarea
                                value={editForm.options}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        options: e.target.value,
                                    }))
                                }
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="edit-multi"
                                checked={editForm.allowMultipleSelections}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        allowMultipleSelections:
                                            e.target.checked,
                                    }))
                                }
                            />
                            <label htmlFor="edit-multi" className="text-sm">
                                Autoriser plusieurs choix
                            </label>
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
                                const options = editForm.options
                                    .split("\n")
                                    .map((o) => o.trim())
                                    .filter(Boolean);
                                if (!editForm.question || options.length < 2)
                                    return;
                                updatePollMutation.mutate(
                                    {
                                        pollId: editingPoll.id,
                                        payload: { ...editForm, options },
                                    },
                                    {
                                        onSuccess: () =>
                                            setIsEditModalOpen(false),
                                    },
                                );
                            }}
                            disabled={updatePollMutation.isPending}
                        >
                            {updatePollMutation.isPending
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
                            Supprimer le sondage
                        </DialogTitle>
                        <DialogDescription>
                            Voulez-vous vraiment supprimer{" "}
                            <span className="font-bold">
                                "{pollToDelete?.question}"
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
                                if (pollToDelete) {
                                    deletePollMutation.mutate(pollToDelete.id, {
                                        onSuccess: () =>
                                            setIsDeleteDialogOpen(false),
                                    });
                                }
                            }}
                            disabled={deletePollMutation.isPending}
                        >
                            {deletePollMutation.isPending
                                ? "Suppression..."
                                : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

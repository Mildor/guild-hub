import { useMemo, useState } from "react";
import {
    useCreateEvent,
    useDeleteEvent,
    useGetAllEvents,
    useUpdateEvent,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus,
    Pencil,
    Trash2,
    Calendar,
    Users,
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
import { cn } from "@/lib/utils";
import {
    formatDate,
    toIsoFromLocalInput,
    toLocalDateTimeInput,
} from "../adminUtils";
import { AttendanceManager } from "./AttendanceManager";

export function EventsSection() {
    const { data: events = [], isLoading } = useGetAllEvents();
    const createEventMutation = useCreateEvent();
    const updateEventMutation = useUpdateEvent();
    const deleteEventMutation = useDeleteEvent();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any | null>(null);
    const [managingAttendanceId, setManagingAttendanceId] = useState<
        string | null
    >(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<any | null>(null);

    const emptyForm = { title: "", description: "", eventDate: "" };
    const [createForm, setCreateForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyForm);

    const sortedEvents = useMemo(() => {
        return [...events].sort(
            (a, b) =>
                new Date(b.eventDate).getTime() -
                new Date(a.eventDate).getTime(),
        );
    }, [events]);

    if (isLoading) {
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
                        Événements
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Planifiez et gérez les raids et activités de la guilde.
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
                    Créer un événement
                </Button>
            </div>

            <Dialog
                open={!!managingAttendanceId}
                onOpenChange={() => setManagingAttendanceId(null)}
            >
                <DialogContent className="max-w-4xl">
                    <AttendanceManager
                        eventId={managingAttendanceId!}
                        onClose={() => setManagingAttendanceId(null)}
                    />
                </DialogContent>
            </Dialog>

            {/* List */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">
                                Événement
                            </TableHead>
                            <TableHead className="font-semibold">
                                Date
                            </TableHead>
                            <TableHead className="font-semibold">
                                Description
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                                Présences
                            </TableHead>
                            <TableHead className="text-right font-semibold">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedEvents.map((event) => (
                            <TableRow
                                key={event.id}
                                className="hover:bg-accent/5 transition-colors"
                            >
                                <TableCell>
                                    <span className="font-bold text-foreground">
                                        {event.title}
                                    </span>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">
                                            {formatDate(event.eventDate)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(
                                                event.eventDate,
                                            ).toLocaleTimeString("fr-FR", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[200px]">
                                    <p className="truncate text-xs text-muted-foreground italic">
                                        {event.description}
                                    </p>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Gérer les présences"
                                        className="font-mono text-xs hover:bg-primary/10 hover:text-primary gap-2 transition-all"
                                        onClick={() =>
                                            setManagingAttendanceId(event.id)
                                        }
                                    >
                                        <Users className="h-4 w-4" />
                                        {event._count?.attendances ?? 0}
                                    </Button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Modifier"
                                            onClick={() => {
                                                setEditingEvent(event);
                                                setEditForm({
                                                    title: event.title,
                                                    description:
                                                        event.description,
                                                    eventDate:
                                                        toLocalDateTimeInput(
                                                            event.eventDate,
                                                        ),
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
                                                setEventToDelete(event);
                                                setIsDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Create Event Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Créer un événement
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Titre
                            </label>
                            <Input
                                value={createForm.title}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        title: e.target.value,
                                    }))
                                }
                                placeholder="Nom de l'événement"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Date et Heure
                            </label>
                            <Input
                                type="datetime-local"
                                value={createForm.eventDate}
                                onChange={(e) =>
                                    setCreateForm((p) => ({
                                        ...p,
                                        eventDate: e.target.value,
                                    }))
                                }
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
                                placeholder="Détails..."
                                className="min-h-[100px]"
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
                                if (!createForm.title || !createForm.eventDate)
                                    return;
                                createEventMutation.mutate(
                                    {
                                        title: createForm.title,
                                        description: createForm.description,
                                        eventDate: toIsoFromLocalInput(
                                            createForm.eventDate,
                                        ),
                                    },
                                    {
                                        onSuccess: () =>
                                            setIsAddModalOpen(false),
                                    },
                                );
                            }}
                            disabled={createEventMutation.isPending}
                        >
                            {createEventMutation.isPending
                                ? "Publication..."
                                : "Publier"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Event Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Modifier l'événement
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Titre
                            </label>
                            <Input
                                value={editForm.title}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        title: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                                Date et Heure
                            </label>
                            <Input
                                type="datetime-local"
                                value={editForm.eventDate}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        eventDate: e.target.value,
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
                                className="min-h-[100px]"
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
                                if (editingEvent) {
                                    updateEventMutation.mutate(
                                        {
                                            id: editingEvent.id,
                                            payload: {
                                                title: editForm.title,
                                                description:
                                                    editForm.description,
                                                eventDate: toIsoFromLocalInput(
                                                    editForm.eventDate,
                                                ),
                                            },
                                        },
                                        {
                                            onSuccess: () =>
                                                setIsEditModalOpen(false),
                                        },
                                    );
                                }
                            }}
                            disabled={updateEventMutation.isPending}
                        >
                            {updateEventMutation.isPending
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
                            Supprimer l'événement
                        </DialogTitle>
                        <DialogDescription>
                            Voulez-vous vraiment supprimer{" "}
                            <span className="font-bold">
                                {eventToDelete?.title}
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
                                if (eventToDelete) {
                                    deleteEventMutation.mutate(
                                        eventToDelete.id,
                                        {
                                            onSuccess: () =>
                                                setIsDeleteDialogOpen(false),
                                        },
                                    );
                                }
                            }}
                            disabled={deleteEventMutation.isPending}
                        >
                            {deleteEventMutation.isPending
                                ? "Suppression..."
                                : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

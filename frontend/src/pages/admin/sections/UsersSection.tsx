import { useMemo, useState } from "react";
import {
    useDeleteUserByAdmin,
    useGetAllUsers,
    useUpdateUserRole,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Search,
    UserCog,
    Trash2,
    ShieldCheck,
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
import { AppRole } from "@/types/auth";
import { ROLE_BADGE_STYLES } from "@/lib/wowColors";
import { availableRoles, formatDate } from "../adminUtils";
import { cn } from "@/lib/utils";

export function UsersSection() {
    const { data: users = [], isLoading } = useGetAllUsers();
    const updateRoleMutation = useUpdateUserRole();
    const deleteUserMutation = useDeleteUserByAdmin();
    const [query, setQuery] = useState("");
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [newRole, setNewRole] = useState<AppRole | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any | null>(null);

    const filteredUsers = useMemo(() => {
        const search = query.trim().toLowerCase();
        return users.filter((user) =>
            user.battletag.toLowerCase().includes(search),
        );
    }, [users, query]);

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
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Utilisateurs
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Gérez les rôles et les comptes utilisateurs.
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Rechercher un BattleTag"
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">
                                BattleTag
                            </TableHead>
                            <TableHead className="font-semibold">
                                Inscription
                            </TableHead>
                            <TableHead className="font-semibold">
                                Persos
                            </TableHead>
                            <TableHead className="font-semibold">
                                Rôle
                            </TableHead>
                            <TableHead className="text-right font-semibold">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Aucun utilisateur trouvé.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className="hover:bg-accent/5 transition-colors"
                                >
                                    <TableCell className="font-medium">
                                        {user.battletag}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(user.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-[10px]"
                                        >
                                            {user._count?.characters ?? 0}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`${ROLE_BADGE_STYLES[user.appRole]} uppercase text-[10px] tracking-wider`}
                                        >
                                            {user.appRole}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Gérer les droits"
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setNewRole(user.appRole);
                                                }}
                                            >
                                                <UserCog className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    setUserToDelete(user);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog
                open={!!editingUser}
                onOpenChange={(open) => !open && setEditingUser(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Gérer les droits de {editingUser?.battletag}
                        </DialogTitle>
                        <DialogDescription>
                            Modifiez le rôle de l'utilisateur pour contrôler ses
                            accès.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-2">
                            {availableRoles.map((role) => (
                                <Button
                                    key={role}
                                    variant={
                                        newRole === role ? "default" : "outline"
                                    }
                                    className={cn(
                                        "h-12 justify-center gap-2 font-bold uppercase text-[10px] tracking-widest transition-all",
                                        newRole === role
                                            ? ROLE_BADGE_STYLES[role]
                                            : "hover:border-primary/50",
                                    )}
                                    onClick={() => setNewRole(role)}
                                >
                                    {role}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingUser(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={() => {
                                if (editingUser && newRole) {
                                    updateRoleMutation.mutate(
                                        { id: editingUser.id, role: newRole },
                                        {
                                            onSuccess: () =>
                                                setEditingUser(null),
                                        },
                                    );
                                }
                            }}
                            disabled={
                                updateRoleMutation.isPending ||
                                newRole === editingUser?.appRole
                            }
                        >
                            {updateRoleMutation.isPending
                                ? "Mise à jour..."
                                : "Enregistrer les modifications"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <DialogContent className="max-w-sm border-destructive/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                            Confirmation de suppression
                        </DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer le compte de{" "}
                            <span className="font-bold">
                                {userToDelete?.battletag}
                            </span>{" "}
                            ? Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="grid grid-cols-2 gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (userToDelete) {
                                    deleteUserMutation.mutate(userToDelete.id, {
                                        onSuccess: () =>
                                            setIsDeleteDialogOpen(false),
                                    });
                                }
                            }}
                            disabled={deleteUserMutation.isPending}
                        >
                            {deleteUserMutation.isPending
                                ? "Suppression..."
                                : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

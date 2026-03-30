import { AppRole } from "@/types/auth";
import { RoleGuard } from "@/components/RoleGuard";
import {
    useDeleteCharacter,
    useDeleteEvent,
    useGetAllCharacters,
    useGetAllEvents,
    useGetAllUsers,
    useUpdateUserRole,
} from "@/api/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";

const availableRoles: AppRole[] = [
    AppRole.ADMIN,
    AppRole.OFFICER,
    AppRole.MEMBER,
    AppRole.GUEST,
];

const roleBadgeClassMap: Record<AppRole, string> = {
    [AppRole.ADMIN]:
        "bg-red-500/20 text-red-700 border border-red-400/40 dark:text-red-300",
    [AppRole.OFFICER]:
        "bg-blue-500/20 text-blue-700 border border-blue-400/40 dark:text-blue-300",
    [AppRole.MEMBER]:
        "bg-green-500/20 text-green-700 border border-green-400/40 dark:text-green-300",
    [AppRole.GUEST]:
        "bg-slate-500/20 text-slate-700 border border-slate-400/40 dark:text-slate-300",
};

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

const classTextColorMap: Record<string, string> = {
    Guerrier: "text-[#C69B6D]",
    Paladin: "text-[#F48CBA]",
    Chasseur: "text-[#ABD473]",
    Voleur: "text-[#FFF468]",
    Pretre: "text-[#FFFFFF]",
    "Chevalier de la mort": "text-[#C41E3A]",
    Chaman: "text-[#0070DD]",
    Mage: "text-[#3FC7EB]",
    Demoniste: "text-[#8788EE]",
    Moine: "text-[#00FF98]",
    Druide: "text-[#FF7C0A]",
    DemonHunter: "text-[#A330C9]",
    Evoker: "text-[#33937F]",
};

function normalizeClassName(className: string): string {
    return className
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .replace(/_/g, "");
}

function CharactersTab() {
    const { data: characters, isLoading } = useGetAllCharacters();
    const deleteCharacterMutation = useDeleteCharacter();

    if (isLoading) {
        return (
            <div className="space-y-3 pt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Joueur (BattleTag)</TableHead>
                        <TableHead>Personnage</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Niveau d&apos;objet</TableHead>
                        <TableHead>Roster</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {characters?.map((character) => {
                        const normalizedClass = normalizeClassName(
                            character.class,
                        );
                        const classColor =
                            classTextColorMap[normalizedClass] ||
                            "text-foreground";
                        const isDeleting =
                            deleteCharacterMutation.isPending &&
                            deleteCharacterMutation.variables === character.id;

                        return (
                            <TableRow key={character.id}>
                                <TableCell className="font-medium">
                                    {character.user?.battletag || "Inconnu"}
                                </TableCell>
                                <TableCell>{character.name}</TableCell>
                                <TableCell className={classColor}>
                                    {character.class}
                                </TableCell>
                                <TableCell>
                                    {Math.round(character.ilvl)}
                                </TableCell>
                                <TableCell>
                                    {character.inRoster ? "Oui" : "Non"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        disabled={isDeleting}
                                        onClick={() => {
                                            const confirmed = window.confirm(
                                                `Supprimer le personnage ${character.name} ? Cette action est irreversible.`,
                                            );
                                            if (!confirmed) {
                                                return;
                                            }
                                            deleteCharacterMutation.mutate(
                                                character.id,
                                            );
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function EventsTab() {
    const { data: events, isLoading } = useGetAllEvents();
    const deleteEventMutation = useDeleteEvent();

    if (isLoading) {
        return (
            <div className="space-y-3 pt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    if (!events || events.length === 0) {
        return (
            <div className="pt-4">
                <Alert>
                    <AlertDescription>
                        Aucun événement planifié.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Date &amp; Heure</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Participants</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {events.map((event) => {
                        const isDeleting =
                            deleteEventMutation.isPending &&
                            deleteEventMutation.variables === event.id;
                        const eventDate = new Date(event.eventDate);

                        return (
                            <TableRow key={event.id}>
                                <TableCell className="font-medium">
                                    {event.title}
                                </TableCell>
                                <TableCell>
                                    {eventDate.toLocaleDateString("fr-FR")}{" "}
                                    {eventDate.toLocaleTimeString("fr-FR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </TableCell>
                                <TableCell>
                                    {event.createdBy?.battletag || "Inconnu"}
                                </TableCell>
                                <TableCell>
                                    {event._count?.attendances ?? 0}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        disabled={isDeleting}
                                        onClick={() => {
                                            const confirmed = window.confirm(
                                                `Supprimer l'événement ${event.title} ? Cette action est irreversible.`,
                                            );
                                            if (!confirmed) {
                                                return;
                                            }
                                            deleteEventMutation.mutate(
                                                event.id,
                                            );
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function UsersTab() {
    const { data: users, isLoading } = useGetAllUsers();
    const updateRoleMutation = useUpdateUserRole();

    if (isLoading) {
        return (
            <div className="space-y-3 pt-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>BattleTag</TableHead>
                        <TableHead>Date d&apos;inscription</TableHead>
                        <TableHead>Role actuel</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users?.map((user) => {
                        const isUpdating =
                            updateRoleMutation.isPending &&
                            updateRoleMutation.variables?.id === user.id;

                        return (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                    {user.battletag}
                                </TableCell>
                                <TableCell>
                                    {formatDate(user.createdAt)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        className={
                                            roleBadgeClassMap[user.appRole]
                                        }
                                    >
                                        {user.appRole}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={user.appRole}
                                        disabled={isUpdating}
                                        onChange={(e) => {
                                            const nextRole = e.target.value;
                                            if (nextRole === user.appRole) {
                                                return;
                                            }

                                            updateRoleMutation.mutate({
                                                id: user.id,
                                                role: nextRole as AppRole,
                                            });
                                        }}
                                        className="w-[180px]"
                                    >
                                        {availableRoles.map((role) => (
                                            <option key={role} value={role}>
                                                {role}
                                            </option>
                                        ))}
                                    </Select>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

export function AdminPage() {
    return (
        <RoleGuard allowedRoles={[AppRole.ADMIN]}>
            <div className="min-h-full bg-background">
                <div className="container mx-auto p-6 space-y-6">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                            Administration
                        </h1>
                        <p className="text-muted-foreground">
                            Gerez les utilisateurs, personnages et evenements.
                        </p>
                    </div>

                    <Tabs defaultValue="users" className="w-full">
                        <TabsList>
                            <TabsTrigger value="users">
                                Utilisateurs
                            </TabsTrigger>
                            <TabsTrigger value="characters">
                                Personnages
                            </TabsTrigger>
                            <TabsTrigger value="events">Evenements</TabsTrigger>
                        </TabsList>

                        <TabsContent value="users">
                            <UsersTab />
                        </TabsContent>

                        <TabsContent value="characters">
                            <CharactersTab />
                        </TabsContent>

                        <TabsContent value="events">
                            <EventsTab />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </RoleGuard>
    );
}

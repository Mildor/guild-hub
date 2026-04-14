import { useMemo, useState } from "react";
import { AppRole } from "@/types/auth";
import { RoleGuard } from "@/components/RoleGuard";
import {
  useCreateCharacter,
  useCreateEvent,
  useCreatePoll,
  useCreateStrategy,
  useDeleteCharacter,
  useDeleteEvent,
  useDeletePoll,
  useDeleteStrategy,
  useDeleteUserByAdmin,
  useGetAllCharacters,
  useGetAllEvents,
  useGetFailedLoginAttempts,
  useGetGuildUnlinkedMembers,
  useGetAllUsers,
  useGetPolls,
  useGetStrategies,
  useSyncAllCharacters,
  useTogglePoll,
  useToggleRoster,
  useUpdateCharacter,
  useUpdateEvent,
  useUpdatePoll,
  useUpdateStrategy,
  useUpdateUserRole,
  type AdminUser,
  type CharacterWithUser,
  type EventWithMeta,
  type FailedLoginAttempt,
  type FailedLoginAttemptsResponse,
  type Poll,
  type RaiderIoGuildUnlinkedMember,
  type Strategy,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Pencil, Plus, Save, X, Shield, Database, RefreshCcw, Link2Off, AlertTriangle } from "lucide-react";
import { getClassColorClass, ROLE_BADGE_STYLES } from "@/lib/wowColors";

const GUILD_REALM = "archimonde";
const GUILD_NAME = "The Good Place";

const availableRoles: AppRole[] = [
  AppRole.ADMIN,
  AppRole.OFFICER,
  AppRole.MEMBER,
  AppRole.GUEST,
];

const gameRoles = ["TANK", "HEALER", "DPS"] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString("fr-FR")} ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoFromLocalInput(value: string) {
  return new Date(value).toISOString();
}

function LoadingRows() {
  return (
    <div className="space-y-3 pt-4">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

function OverviewTab({
  users,
  characters,
  events,
  polls,
  strategies,
  isLoading,
}: {
  users: AdminUser[];
  characters: CharacterWithUser[];
  events: EventWithMeta[];
  polls: Poll[];
  strategies: Strategy[];
  isLoading: boolean;
}) {
  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.eventDate) > new Date()),
    [events],
  );

  const activePolls = useMemo(
    () => polls.filter((poll) => poll.isActive),
    [polls],
  );

  const rosterCount = useMemo(
    () => characters.filter((character) => character.inRoster).length,
    [characters],
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 pt-5 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-card/60 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Utilisateurs</p>
          <p className="mt-2 text-3xl font-black text-foreground">{users.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Gestion des roles et suppression</p>
        </div>
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-card/60 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Personnages</p>
          <p className="mt-2 text-3xl font-black text-foreground">{characters.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{rosterCount} dans le roster guilde</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-card/60 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Evenements</p>
          <p className="mt-2 text-3xl font-black text-foreground">{events.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{upcomingEvents.length} a venir</p>
        </div>
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-card/60 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Contenus</p>
          <p className="mt-2 text-3xl font-black text-foreground">{polls.length + strategies.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{activePolls.length} sondages actifs</p>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, isLoading }: { users: AdminUser[]; isLoading: boolean }) {
  const updateRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUserByAdmin();
  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((user) => user.battletag.toLowerCase().includes(search));
  }, [users, query]);

  if (isLoading) {
    return <LoadingRows />;
  }

  return (
    <div className="space-y-4 pt-5">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher un BattleTag"
      />

      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>BattleTag</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Changer role</TableHead>
              <TableHead className="text-right">Supprimer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const isUpdating =
                updateRoleMutation.isPending && updateRoleMutation.variables?.id === user.id;
              const isDeleting =
                deleteUserMutation.isPending && deleteUserMutation.variables === user.id;

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.battletag}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_BADGE_STYLES[user.appRole]}>{user.appRole}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.appRole}
                      disabled={isUpdating}
                      onChange={(event) => {
                        const nextRole = event.target.value as AppRole;
                        if (nextRole === user.appRole) {
                          return;
                        }
                        updateRoleMutation.mutate({ id: user.id, role: nextRole });
                      }}
                      className="w-full md:w-[180px]"
                    >
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="icon"
                      disabled={isDeleting}
                      onClick={() => {
                        const ok = window.confirm(
                          `Supprimer le compte ${user.battletag} ? Cette action est irreversible.`,
                        );
                        if (ok) {
                          deleteUserMutation.mutate(user.id);
                        }
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
    </div>
  );
}

function FailedLoginsTab({
  data,
  isLoading,
  page,
  onPageChange,
}: {
  data: FailedLoginAttemptsResponse | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (nextPage: number) => void;
}) {
  const [query, setQuery] = useState("");

  const rows = data?.items ?? [];

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return rows;
    }

    return rows.filter((attempt: FailedLoginAttempt) => {
      const identifier = attempt.identifier?.toLowerCase() ?? "";
      const ipAddress = attempt.ipAddress?.toLowerCase() ?? "";
      const reason = attempt.reason.toLowerCase();
      const provider = attempt.provider.toLowerCase();

      return (
        identifier.includes(search) ||
        ipAddress.includes(search) ||
        reason.includes(search) ||
        provider.includes(search)
      );
    });
  }, [rows, query]);

  if (isLoading) {
    return <LoadingRows />;
  }

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4 pt-5">
      <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/15 to-card/60 p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Connexions echouees</p>
        <p className="mt-2 text-3xl font-black text-foreground">{total}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Journal des tentatives de connexion refusees sur l'authentification Battle.net.
        </p>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher par IP, identifiant, provider ou raison"
      />

      {filteredRows.length === 0 ? (
        <Alert>
          <AlertDescription>Aucune tentative echouee sur cette page avec ce filtre.</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>User-Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>{formatDateTime(attempt.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{attempt.provider}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{attempt.identifier || "-"}</TableCell>
                  <TableCell>{attempt.ipAddress || "-"}</TableCell>
                  <TableCell>{attempt.reason}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                    {attempt.userAgent || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Page {page} sur {totalPages}
        </p>
        <div className="inline-flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Precedent
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}

function UnlinkedGuildMembersTab({
  members,
  isLoading,
}: {
  members: RaiderIoGuildUnlinkedMember[];
  isLoading: boolean;
}) {
  const [query, setQuery] = useState("");

  const filteredMembers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return members;
    }

    return members.filter((member) => {
      return (
        member.name.toLowerCase().includes(search) ||
        member.realm.toLowerCase().includes(search) ||
        (member.class || "").toLowerCase().includes(search)
      );
    });
  }, [members, query]);

  if (isLoading) {
    return <LoadingRows />;
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-card/60 p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Personnages sans compte lie</p>
        <p className="mt-2 text-3xl font-black text-foreground">{members.length}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Personnages presents dans le roster Blizzard de guilde mais absents des personnages lies dans l'application.
        </p>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher personnage, royaume ou classe"
      />

      {filteredMembers.length === 0 ? (
        <Alert>
          <AlertDescription>
            Aucun personnage non relie trouve avec les filtres actuels.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Personnage</TableHead>
                <TableHead>Royaume</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Rang guilde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={`${member.name}-${member.realm}`}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.realm}</TableCell>
                  <TableCell className={member.class ? getClassColorClass(member.class) : ""}>
                    {member.class || "Inconnu"}
                  </TableCell>
                  <TableCell>{member.guildRank ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CharactersTab({
  users,
  characters,
  isLoading,
}: {
  users: AdminUser[];
  characters: CharacterWithUser[];
  isLoading: boolean;
}) {
  const createCharacterMutation = useCreateCharacter();
  const updateCharacterMutation = useUpdateCharacter();
  const deleteCharacterMutation = useDeleteCharacter();
  const toggleRosterMutation = useToggleRoster();

  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ilvl: "", activeSpec: "", gameRole: "DPS" as "TANK" | "HEALER" | "DPS" });

  const [createForm, setCreateForm] = useState({
    userId: "",
    name: "",
    realm: "",
    class: "",
    activeSpec: "",
    gameRole: "DPS" as "TANK" | "HEALER" | "DPS",
  });

  const filteredCharacters = useMemo(() => {
    const search = query.trim().toLowerCase();
    return characters.filter((character) => {
      return (
        character.name.toLowerCase().includes(search) ||
        character.user?.battletag?.toLowerCase().includes(search)
      );
    });
  }, [characters, query]);

  if (isLoading) {
    return <LoadingRows />;
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 md:p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Creation personnage
        </h3>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Select
            value={createForm.userId}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, userId: event.target.value }))}
          >
            <option value="">Choisir utilisateur</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.battletag}
              </option>
            ))}
          </Select>
          <Input
            value={createForm.name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nom personnage"
          />
          <Input
            value={createForm.realm}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, realm: event.target.value }))}
            placeholder="Royaume"
          />
          <Input
            value={createForm.class}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, class: event.target.value }))}
            placeholder="Classe"
          />
          <Input
            value={createForm.activeSpec}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, activeSpec: event.target.value }))}
            placeholder="Specialisation"
          />
          <Select
            value={createForm.gameRole}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, gameRole: event.target.value as "TANK" | "HEALER" | "DPS" }))
            }
          >
            {gameRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </div>
        <Button
          className="mt-3"
          disabled={createCharacterMutation.isPending}
          onClick={() => {
            if (
              !createForm.userId ||
              !createForm.name ||
              !createForm.realm ||
              !createForm.class ||
              !createForm.activeSpec
            ) {
              window.alert("Tous les champs de creation personnage sont obligatoires.");
              return;
            }

            createCharacterMutation.mutate(createForm, {
              onSuccess: () => {
                setCreateForm({
                  userId: "",
                  name: "",
                  realm: "",
                  class: "",
                  activeSpec: "",
                  gameRole: "DPS",
                });
              },
            });
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Creer le personnage
        </Button>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher personnage ou BattleTag"
      />

      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead>Personnage</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>iLvl</TableHead>
              <TableHead>Spec</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Roster</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCharacters.map((character) => {
              const isEditing = editingId === character.id;
              const isDeleting =
                deleteCharacterMutation.isPending && deleteCharacterMutation.variables === character.id;

              return (
                <TableRow key={character.id}>
                  <TableCell className="font-medium">{character.user?.battletag || "Inconnu"}</TableCell>
                  <TableCell>{character.name}</TableCell>
                  <TableCell className={getClassColorClass(character.class)}>{character.class}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editForm.ilvl}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, ilvl: event.target.value }))}
                        type="number"
                        min={0}
                        className="h-8 w-20"
                      />
                    ) : (
                      Math.round(character.ilvl)
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editForm.activeSpec}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, activeSpec: event.target.value }))
                        }
                        className="h-8 w-32"
                      />
                    ) : (
                      character.activeSpec
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={editForm.gameRole}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            gameRole: event.target.value as "TANK" | "HEALER" | "DPS",
                          }))
                        }
                        className="h-8 w-28"
                      >
                        {gameRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      character.gameRole
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={toggleRosterMutation.isPending}
                      onClick={() =>
                        toggleRosterMutation.mutate({ id: character.id, inRoster: !character.inRoster })
                      }
                    >
                      {character.inRoster ? "Oui" : "Non"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="icon"
                            onClick={() => {
                              const ilvlValue = Number(editForm.ilvl);
                              if (Number.isNaN(ilvlValue) || ilvlValue < 0) {
                                window.alert("iLvl invalide.");
                                return;
                              }

                              updateCharacterMutation.mutate(
                                {
                                  id: character.id,
                                  payload: {
                                    ilvl: ilvlValue,
                                    activeSpec: editForm.activeSpec,
                                    gameRole: editForm.gameRole,
                                  },
                                },
                                {
                                  onSuccess: () => setEditingId(null),
                                },
                              );
                            }}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingId(character.id);
                            setEditForm({
                              ilvl: String(Math.round(character.ilvl)),
                              activeSpec: character.activeSpec,
                              gameRole: character.gameRole,
                            });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={isDeleting}
                        onClick={() => {
                          const ok = window.confirm(
                            `Supprimer le personnage ${character.name} ? Cette action est irreversible.`,
                          );
                          if (ok) {
                            deleteCharacterMutation.mutate(character.id);
                          }
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
  );
}

function EventsTab({ events, isLoading }: { events: EventWithMeta[]; isLoading: boolean }) {
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    eventDate: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    eventDate: "",
  });

  if (isLoading) {
    return <LoadingRows />;
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 md:p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Creation evenement
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={createForm.title}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titre"
          />
          <Input
            type="datetime-local"
            value={createForm.eventDate}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, eventDate: event.target.value }))}
          />
          <Input
            value={createForm.description}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Description"
          />
        </div>
        <Button
          className="mt-3"
          disabled={createEventMutation.isPending}
          onClick={() => {
            if (!createForm.title || !createForm.description || !createForm.eventDate) {
              window.alert("Titre, description et date sont obligatoires.");
              return;
            }

            createEventMutation.mutate(
              {
                title: createForm.title,
                description: createForm.description,
                eventDate: toIsoFromLocalInput(createForm.eventDate),
              },
              {
                onSuccess: () => {
                  setCreateForm({ title: "", description: "", eventDate: "" });
                },
              },
            );
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Creer l'evenement
        </Button>
      </div>

      {events.length === 0 ? (
        <Alert>
          <AlertDescription>Aucun evenement planifie.</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const isEditing = editingId === event.id;
                const isDeleting =
                  deleteEventMutation.isPending && deleteEventMutation.variables === event.id;

                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                          className="h-8"
                        />
                      ) : (
                        <span className="font-medium">{event.title}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="datetime-local"
                          value={editForm.eventDate}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, eventDate: e.target.value }))
                          }
                          className="h-8"
                        />
                      ) : (
                        formatDateTime(event.eventDate)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, description: e.target.value }))
                          }
                          className="h-8"
                        />
                      ) : (
                        event.description
                      )}
                    </TableCell>
                    <TableCell>{event._count?.attendances ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="icon"
                              onClick={() => {
                                if (!editForm.title || !editForm.description || !editForm.eventDate) {
                                  window.alert("Tous les champs edition evenement sont obligatoires.");
                                  return;
                                }
                                updateEventMutation.mutate(
                                  {
                                    id: event.id,
                                    payload: {
                                      title: editForm.title,
                                      description: editForm.description,
                                      eventDate: toIsoFromLocalInput(editForm.eventDate),
                                    },
                                  },
                                  { onSuccess: () => setEditingId(null) },
                                );
                              }}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setEditingId(event.id);
                              setEditForm({
                                title: event.title,
                                description: event.description,
                                eventDate: toLocalDateTimeInput(event.eventDate),
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="destructive"
                          size="icon"
                          disabled={isDeleting}
                          onClick={() => {
                            const ok = window.confirm(
                              `Supprimer l'evenement ${event.title} ? Cette action est irreversible.`,
                            );
                            if (ok) {
                              deleteEventMutation.mutate(event.id);
                            }
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
      )}
    </div>
  );
}

function PollsTab({ polls, isLoading }: { polls: Poll[]; isLoading: boolean }) {
  const createPollMutation = useCreatePoll();
  const updatePollMutation = useUpdatePoll();
  const togglePollMutation = useTogglePoll();
  const deletePollMutation = useDeletePoll();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    question: "",
    description: "",
    options: "",
    allowMultipleSelections: false,
  });
  const [editForm, setEditForm] = useState({
    question: "",
    description: "",
    options: "",
    allowMultipleSelections: false,
  });

  if (isLoading) {
    return <LoadingRows />;
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 md:p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Creation sondage
        </h3>
        <div className="space-y-3">
          <Input
            value={createForm.question}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, question: event.target.value }))}
            placeholder="Question"
          />
          <Textarea
            value={createForm.description}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Description"
          />
          <Textarea
            value={createForm.options}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, options: event.target.value }))}
            placeholder="Options (une par ligne)"
          />
          <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={createForm.allowMultipleSelections}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, allowMultipleSelections: event.target.checked }))
              }
            />
            Autoriser plusieurs réponses
          </label>
        </div>
        <Button
          className="mt-3"
          disabled={createPollMutation.isPending}
          onClick={() => {
            const options = createForm.options
              .split("\n")
              .map((option) => option.trim())
              .filter(Boolean);

            if (options.length < 2) {
              window.alert("Un sondage doit contenir au moins 2 options.");
              return;
            }

            createPollMutation.mutate(
              {
                question: createForm.question,
                description: createForm.description || undefined,
                options,
                allowMultipleSelections: createForm.allowMultipleSelections,
              },
              {
                onSuccess: () => {
                  setCreateForm({ question: "", description: "", options: "", allowMultipleSelections: false });
                },
              },
            );
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Creer le sondage
        </Button>
      </div>

      <div className="space-y-3">
        {polls.map((poll) => {
          const isEditing = editingId === poll.id;
          const optionsText = poll.options.map((option) => option.text).join("\n");

          return (
            <div key={poll.id} className="rounded-2xl border border-border/60 bg-card/40 p-4 md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={poll.isActive ? "default" : "secondary"}>
                    {poll.isActive ? "Actif" : "Ferme"}
                  </Badge>
                  <Badge variant="outline">
                    {poll.allowMultipleSelections ? "Réponses multiples" : "Réponse unique"}
                  </Badge>
                </div>
                <div className="inline-flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={togglePollMutation.isPending}
                    onClick={() => togglePollMutation.mutate(poll.id)}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {poll.isActive ? "Fermer" : "Ouvrir"}
                  </Button>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(poll.id);
                        setEditForm({
                          question: poll.question,
                          description: poll.description || "",
                          options: optionsText,
                          allowMultipleSelections: poll.allowMultipleSelections,
                        });
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                  ) : null}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletePollMutation.isPending}
                    onClick={() => {
                      const ok = window.confirm(
                        `Supprimer le sondage \"${poll.question}\" ? Cette action est irreversible.`,
                      );
                      if (ok) {
                        deletePollMutation.mutate(poll.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.question}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, question: event.target.value }))
                    }
                    placeholder="Question"
                  />
                  <Textarea
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Description"
                  />
                  <Textarea
                    value={editForm.options}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, options: event.target.value }))
                    }
                    placeholder="Options (une par ligne)"
                  />
                  <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={editForm.allowMultipleSelections}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, allowMultipleSelections: event.target.checked }))
                      }
                    />
                    Autoriser plusieurs réponses
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const options = editForm.options
                          .split("\n")
                          .map((option) => option.trim())
                          .filter(Boolean);

                        if (options.length < 2) {
                          window.alert("Un sondage doit contenir au moins 2 options.");
                          return;
                        }

                        updatePollMutation.mutate(
                          {
                            pollId: poll.id,
                            payload: {
                              question: editForm.question,
                              description: editForm.description || undefined,
                              options,
                              allowMultipleSelections: editForm.allowMultipleSelections,
                            },
                          },
                          { onSuccess: () => setEditingId(null) },
                        );
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      <X className="mr-2 h-4 w-4" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-foreground">{poll.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {poll.allowMultipleSelections ? "Réponses multiples autorisées" : "Réponse unique"}
                  </p>
                  {poll.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{poll.description}</p>
                  ) : null}
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {poll.options.map((option) => {
                      const votes = poll.votes.filter((vote) => vote.optionId === option.id).length;
                      return (
                        <li
                          key={option.id}
                          className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{option.text}</span>
                          <span className="ml-2 text-muted-foreground">{votes} vote(s)</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategiesTab({
  strategies,
  isLoading,
}: {
  strategies: Strategy[];
  isLoading: boolean;
}) {
  const createStrategyMutation = useCreateStrategy();
  const updateStrategyMutation = useUpdateStrategy();
  const deleteStrategyMutation = useDeleteStrategy();

  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = {
    bossName: "",
    raidName: "",
    positioningImageUrl: "",
    generalMechanics: "",
    tankNotes: "",
    healerNotes: "",
    dpsNotes: "",
  };

  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  if (isLoading) {
    return <LoadingRows />;
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 md:p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Creation strategie
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={createForm.raidName}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, raidName: event.target.value }))}
            placeholder="Nom du raid"
          />
          <Input
            value={createForm.bossName}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, bossName: event.target.value }))}
            placeholder="Nom du boss"
          />
          <Input
            value={createForm.positioningImageUrl}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, positioningImageUrl: event.target.value }))
            }
            placeholder="URL image placement (optionnel)"
            className="md:col-span-2"
          />
          <Textarea
            value={createForm.generalMechanics}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, generalMechanics: event.target.value }))
            }
            placeholder="Mecaniques generales"
            className="md:col-span-2"
          />
          <Textarea
            value={createForm.tankNotes}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, tankNotes: event.target.value }))}
            placeholder="Notes Tank"
          />
          <Textarea
            value={createForm.healerNotes}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, healerNotes: event.target.value }))
            }
            placeholder="Notes Healer"
          />
          <Textarea
            value={createForm.dpsNotes}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, dpsNotes: event.target.value }))}
            placeholder="Notes DPS"
            className="md:col-span-2"
          />
        </div>

        <Button
          className="mt-3"
          disabled={createStrategyMutation.isPending}
          onClick={() => {
            if (!createForm.raidName || !createForm.bossName || !createForm.generalMechanics) {
              window.alert("Raid, boss et mecaniques generales sont obligatoires.");
              return;
            }

            createStrategyMutation.mutate(
              {
                raidName: createForm.raidName,
                bossName: createForm.bossName,
                positioningImageUrl: createForm.positioningImageUrl || undefined,
                generalMechanics: createForm.generalMechanics,
                tankNotes: createForm.tankNotes || undefined,
                healerNotes: createForm.healerNotes || undefined,
                dpsNotes: createForm.dpsNotes || undefined,
              },
              { onSuccess: () => setCreateForm(emptyForm) },
            );
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Creer la strategie
        </Button>
      </div>

      <div className="space-y-3">
        {strategies.map((strategy) => {
          const isEditing = editingId === strategy.id;

          return (
            <div key={strategy.id} className="rounded-2xl border border-border/60 bg-card/40 p-4 md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{strategy.raidName}</p>
                  <p className="text-lg font-semibold text-foreground">{strategy.bossName}</p>
                </div>
                <div className="inline-flex gap-2">
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(strategy.id);
                        setEditForm({
                          raidName: strategy.raidName,
                          bossName: strategy.bossName,
                          positioningImageUrl: strategy.positioningImageUrl || "",
                          generalMechanics: strategy.generalMechanics,
                          tankNotes: strategy.tankNotes || "",
                          healerNotes: strategy.healerNotes || "",
                          dpsNotes: strategy.dpsNotes || "",
                        });
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                  ) : null}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteStrategyMutation.isPending}
                    onClick={() => {
                      const ok = window.confirm(
                        `Supprimer la strategie ${strategy.bossName} ? Cette action est irreversible.`,
                      );
                      if (ok) {
                        deleteStrategyMutation.mutate(strategy.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={editForm.raidName}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, raidName: event.target.value }))
                      }
                      placeholder="Nom du raid"
                    />
                    <Input
                      value={editForm.bossName}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, bossName: event.target.value }))
                      }
                      placeholder="Nom du boss"
                    />
                  </div>
                  <Input
                    value={editForm.positioningImageUrl}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, positioningImageUrl: event.target.value }))
                    }
                    placeholder="URL image placement"
                  />
                  <Textarea
                    value={editForm.generalMechanics}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, generalMechanics: event.target.value }))
                    }
                    placeholder="Mecaniques generales"
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <Textarea
                      value={editForm.tankNotes}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, tankNotes: event.target.value }))
                      }
                      placeholder="Tank"
                    />
                    <Textarea
                      value={editForm.healerNotes}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, healerNotes: event.target.value }))
                      }
                      placeholder="Healer"
                    />
                    <Textarea
                      value={editForm.dpsNotes}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, dpsNotes: event.target.value }))
                      }
                      placeholder="DPS"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (!editForm.raidName || !editForm.bossName || !editForm.generalMechanics) {
                          window.alert("Raid, boss et mecaniques generales sont obligatoires.");
                          return;
                        }

                        updateStrategyMutation.mutate(
                          {
                            id: strategy.id,
                            raidName: editForm.raidName,
                            bossName: editForm.bossName,
                            positioningImageUrl: editForm.positioningImageUrl || undefined,
                            generalMechanics: editForm.generalMechanics,
                            tankNotes: editForm.tankNotes || undefined,
                            healerNotes: editForm.healerNotes || undefined,
                            dpsNotes: editForm.dpsNotes || undefined,
                          },
                          { onSuccess: () => setEditingId(null) },
                        );
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      <X className="mr-2 h-4 w-4" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{strategy.generalMechanics}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OperationsTab() {
  const syncAllMutation = useSyncAllCharacters();

  return (
    <div className="space-y-4 pt-5">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-card/50 p-4 md:p-6">
        <h3 className="text-lg font-semibold text-foreground">Operation globale</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Lance une resynchronisation complete des personnages et metiers de tous les comptes.
        </p>

        <Button
          className="mt-4 bg-amber-500 text-black hover:bg-amber-400"
          disabled={syncAllMutation.isPending}
          onClick={() => syncAllMutation.mutate()}
        >
          <Database className="mr-2 h-4 w-4" />
          {syncAllMutation.isPending ? "Synchronisation..." : "Synchroniser toute la guilde"}
        </Button>

        {syncAllMutation.data ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Comptes traites</p>
              <p className="mt-1 text-xl font-bold">
                {syncAllMutation.data.processedUsers}/{syncAllMutation.data.totalUsers}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Personnages sync</p>
              <p className="mt-1 text-xl font-bold">{syncAllMutation.data.syncedCharacters}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Erreurs</p>
              <p className="mt-1 text-xl font-bold">{syncAllMutation.data.failedUsers.length}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminPage() {
  const [failedLoginsPage, setFailedLoginsPage] = useState(1);

  const { data: users = [], isLoading: isUsersLoading } = useGetAllUsers();
  const { data: characters = [], isLoading: isCharactersLoading } = useGetAllCharacters();
  const { data: events = [], isLoading: isEventsLoading } = useGetAllEvents();
  const { data: polls = [], isLoading: isPollsLoading } = useGetPolls();
  const { data: strategies = [], isLoading: isStrategiesLoading } = useGetStrategies();
  const {
    data: failedLoginAttempts,
    isLoading: isFailedLoginAttemptsLoading,
  } = useGetFailedLoginAttempts(failedLoginsPage, 50);
  const {
    data: unlinkedGuildMembers = [],
    isLoading: isUnlinkedGuildMembersLoading,
  } = useGetGuildUnlinkedMembers(GUILD_REALM, GUILD_NAME);

  const isOverviewLoading =
    isUsersLoading ||
    isCharactersLoading ||
    isEventsLoading ||
    isPollsLoading ||
    isStrategiesLoading;

  return (
    <RoleGuard allowedRoles={[AppRole.ADMIN]}>
      <div className="min-h-full bg-background">
        <div className="container relative mx-auto space-y-6 p-4 md:p-8">
          <div className="pointer-events-none absolute inset-x-4 top-2 h-28 rounded-3xl bg-[radial-gradient(circle_at_20%_40%,oklch(0.78_0.13_75_/_0.22),transparent_45%),radial-gradient(circle_at_85%_10%,oklch(0.56_0.18_220_/_0.16),transparent_36%)] md:inset-x-8" />

          <div className="relative rounded-3xl border border-border/70 bg-card/55 p-5 backdrop-blur-sm md:p-8">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Shield className="h-3.5 w-3.5" />
              Admin CRUD
            </p>
            <h1 className="text-2xl font-black tracking-tight text-foreground md:text-4xl">
              Dashboard Administration Complete
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Creation, lecture, modification et suppression des entites directement depuis cette page.
            </p>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl border border-border/60 bg-card/60 p-1 md:grid-cols-8">
              <TabsTrigger value="overview">Vue globale</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="failed-logins">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Connexions KO
              </TabsTrigger>
              <TabsTrigger value="unlinked-members">
                <Link2Off className="mr-2 h-4 w-4" />
                Sans compte
              </TabsTrigger>
              <TabsTrigger value="characters">Personnages</TabsTrigger>
              <TabsTrigger value="events">Evenements</TabsTrigger>
              <TabsTrigger value="polls">Sondages</TabsTrigger>
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab
                users={users}
                characters={characters}
                events={events}
                polls={polls}
                strategies={strategies}
                isLoading={isOverviewLoading}
              />
            </TabsContent>

            <TabsContent value="users">
              <UsersTab users={users} isLoading={isUsersLoading} />
            </TabsContent>

            <TabsContent value="failed-logins">
              <FailedLoginsTab
                data={failedLoginAttempts}
                isLoading={isFailedLoginAttemptsLoading}
                page={failedLoginsPage}
                onPageChange={setFailedLoginsPage}
              />
            </TabsContent>

            <TabsContent value="unlinked-members">
              <UnlinkedGuildMembersTab
                members={unlinkedGuildMembers}
                isLoading={isUnlinkedGuildMembersLoading}
              />
            </TabsContent>

            <TabsContent value="characters">
              <CharactersTab users={users} characters={characters} isLoading={isCharactersLoading} />
            </TabsContent>

            <TabsContent value="events">
              <EventsTab events={events} isLoading={isEventsLoading} />
            </TabsContent>

            <TabsContent value="polls">
              <PollsTab polls={polls} isLoading={isPollsLoading} />
            </TabsContent>

            <TabsContent value="strategies">
              <StrategiesTab strategies={strategies} isLoading={isStrategiesLoading} />
            </TabsContent>
          </Tabs>

          <OperationsTab />
        </div>
      </div>
    </RoleGuard>
  );
}

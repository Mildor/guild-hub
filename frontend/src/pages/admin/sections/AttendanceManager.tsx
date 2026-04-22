import { useMemo, useState } from "react";
import { useGetEvent, useGetRoster, useUpsertAttendance } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    X,
    Check,
    Clock,
    Minus,
    Search,
    UserCheck,
    UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getClassColorClass } from "@/lib/wowColors";
import { AttendanceStatus } from "@/types/auth";

interface AttendanceManagerProps {
    eventId: string;
    onClose: () => void;
}

export function AttendanceManager({
    eventId,
    onClose,
}: AttendanceManagerProps) {
    const { data: event, isLoading: isEventLoading } = useGetEvent(eventId);
    const { data: roster = [], isLoading: isRosterLoading } = useGetRoster();
    const upsertMutation = useUpsertAttendance();
    const [search, setSearch] = useState("");

    const isLoading = isEventLoading || isRosterLoading;

    const participants = useMemo(() => {
        if (!event || !roster) return [];

        return roster.map((character) => {
            const attendance = event.attendances.find(
                (a) =>
                    a.characterId === character.id ||
                    (a.userId === character.userId && !a.characterId),
            );
            return {
                ...character,
                attendanceStatus: attendance?.status ?? null,
            };
        });
    }, [event, roster]);

    const filteredParticipants = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return participants;
        return participants.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.user?.battletag?.toLowerCase().includes(q),
        );
    }, [participants, search]);

    if (isLoading) {
        return (
            <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const statuses: {
        label: string;
        value: AttendanceStatus;
        icon: any;
        color: string;
    }[] = [
        {
            label: "Accepté",
            value: "ACCEPTED",
            icon: Check,
            color: "text-emerald-500 bg-emerald-500/10",
        },
        {
            label: "Absent",
            value: "DECLINED",
            icon: X,
            color: "text-red-500 bg-red-500/10",
        },
        {
            label: "En retard",
            value: "LATE",
            icon: Clock,
            color: "text-amber-500 bg-amber-500/10",
        },
        {
            label: "Incertain",
            value: "TENTATIVE",
            icon: Minus,
            color: "text-sky-500 bg-sky-500/10",
        },
    ];

    return (
        <div className="flex flex-col h-full max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-border/50 p-6">
                <div>
                    <h2 className="text-xl font-bold text-foreground">
                        Gestion des présences
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {event?.title}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <div className="p-6 border-b border-border/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un membre du roster..."
                        className="pl-10 h-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {filteredParticipants.map((member) => (
                    <div
                        key={member.id}
                        className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-2 h-8 rounded-full ${getClassColorClass(member.class)}`}
                                />
                                <div>
                                    <p className="font-bold text-foreground">
                                        {member.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase">
                                        {member.user?.battletag}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {member.attendanceStatus ? (
                                    <Badge
                                        className={`${statuses.find((s) => s.value === member.attendanceStatus)?.color} uppercase text-[10px]`}
                                    >
                                        {member.attendanceStatus}
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] uppercase text-muted-foreground opacity-50"
                                    >
                                        Non répondu
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {statuses.map((s) => {
                                const isActive =
                                    member.attendanceStatus === s.value;
                                const isPending =
                                    upsertMutation.isPending &&
                                    upsertMutation.variables?.characterId ===
                                        member.id &&
                                    upsertMutation.variables?.status ===
                                        s.value;

                                return (
                                    <Button
                                        key={s.value}
                                        variant={
                                            isActive ? "default" : "outline"
                                        }
                                        size="sm"
                                        disabled={upsertMutation.isPending}
                                        onClick={() =>
                                            upsertMutation.mutate({
                                                eventId: eventId,
                                                characterId: member.id,
                                                userId: member.userId,
                                                status: s.value,
                                            })
                                        }
                                        className={`h-8 text-[10px] uppercase font-bold gap-1.5 ${isActive ? "" : "hover:" + s.color}`}
                                    >
                                        {isPending ? (
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        ) : (
                                            <s.icon className="h-3.3 w-3.3" />
                                        )}
                                        {s.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

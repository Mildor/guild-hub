import { WclAttendanceTab } from "@/components/admin/WclAttendanceTab";
import { Activity } from "lucide-react";

export function WclAttendanceSection() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Activity className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Warcraft Logs - Taux de Présence
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Cette section analyse les soirées de raid avec un de vos
                        personnages afin de dédoublonner les présences et
                        d'établir un taux d'assiduité par joueur.
                    </p>
                </div>
            </div>

            <div className="mt-8 border rounded-xl overflow-hidden bg-card/50 p-6 shadow-sm border-border">
                <WclAttendanceTab />
            </div>
        </div>
    );
}

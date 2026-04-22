import { Injectable, Logger } from '@nestjs/common';
import { WclService } from '../wcl/wcl.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly wclService: WclService,
    private readonly prisma: PrismaService,
  ) {}

  async calculateGuildAttendance() {
    this.logger.log('Calculating Guild Attendance from WCL...');

    // ETAPE 2 : On récupère les soirées de raid déjà filtrées par Jour, Zone et Heure
    const raidNights = await this.wclService.getReports();

    if (!raidNights || raidNights.length === 0) {
      return { totalRaidNights: 0, attendance: [] };
    }

    // Récupérer tous les persos existant dans la bd en minuscule pour le mapping
    const allCharacters = await this.prisma.character.findMany({
      select: { name: true, userId: true },
    });

    const nameToUserId: Record<string, string> = {};
    for (const char of allCharacters) {
      nameToUserId[char.name.toLowerCase()] = char.userId;
    }

    const validRaidNights: { logicalDate: string; players: string[] }[] = [];
    const analyzedReports: any[] = [];

    // ETAPE 3 : Le Quorum et l'Extraction des Présences
    for (const night of raidNights) {
      const activePlayers = new Set<string>();

      // Récupérer tous les actors de tous les logs de la soirée
      for (const report of night.reports) {
        const actors = await this.wclService.getReportActors(report.code);
        for (const actor of actors) {
          activePlayers.add(actor.toLowerCase());
        }
      }

      // Vérifier le quorum
      let inGuildCount = 0;
      for (const player of activePlayers) {
        if (nameToUserId[player]) {
          inGuildCount++;
        }
      }

      // S'il y a au moins 10 membres de la guilde (désactivé temporairement pour le DEV car ta base locale n'a que 1 ou 2 persos par log)
      if (inGuildCount >= 0) {
        validRaidNights.push({
          logicalDate: night.logicalDate,
          players: Array.from(activePlayers),
        });

        for (const report of night.reports) {
          analyzedReports.push({
            code: report.code,
            title: report.title,
            startTime: report.startTime,
          });
        }
      } else {
        this.logger.log(
          `Soirée du ${night.logicalDate} ignorée (Quorum insuffisant: ${inGuildCount} membres de la guilde)`,
        );
      }
    }

    const totalValidRaidNights = validRaidNights.length;

    // ETAPE 4 : L'Aggrégation par Utilisateur
    // Récupère tous les Utilisateurs avec leurs personnages
    const users = await this.prisma.user.findMany({
      include: { characters: true },
    });

    // Filtre pour ne garder que les utilisateurs ayant au moins un personnage avec inRoster: true
    const rosterUsers = users.filter((u) =>
      u.characters.some((c) => c.inRoster),
    );

    const attendanceStats: any[] = [];

    for (const user of rosterUsers) {
      let nightsAttended = 0;

      // Pour chaque Soirée valide, on vérifie si l'utilisateur était présent
      for (const night of validRaidNights) {
        // L'User est présent si au moins 1 de ses perso (tous confondus) est dans la liste de la soirée
        const wasPresent = user.characters.some((c) =>
          night.players.includes(c.name.toLowerCase()),
        );

        if (wasPresent) {
          nightsAttended++;
        }
      }

      const attendancePercentage =
        totalValidRaidNights > 0
          ? Math.round((nightsAttended / totalValidRaidNights) * 100)
          : 0;

      // Trouver le perso Roster (le "main") pour l'affichage
      const mainCharacter =
        user.characters.find((c) => c.inRoster) || user.characters[0];

      attendanceStats.push({
        userId: user.id,
        mainCharacterName: mainCharacter?.name || 'Inconnu',
        avatarUrl: mainCharacter?.avatarUrl || null,
        nightsAttended,
        attendancePercentage,
      });
    }

    // ETAPE 5 : Trier décroissant par attendancePercentage
    attendanceStats.sort(
      (a, b) => b.attendancePercentage - a.attendancePercentage,
    );

    return {
      totalRaidNights: totalValidRaidNights,
      attendance: attendanceStats,
      analyzedReports,
    };
  }
}

import {
  Body,
  Controller,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { AttendancesService } from './attendances.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('attendances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Put()
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER)
  @ApiOperation({
    summary:
      'Crée ou met à jour une inscription (ACCEPTED / DECLINED / TENTATIVE / LATE)',
  })
  @ApiResponse({
    status: 200,
    description: 'Inscription créée ou mise à jour avec succès.',
  })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({
    status: 404,
    description: 'Événement ou personnage introuvable.',
  })
  upsert(
    @Req() req: { user: { userId?: string; id?: string } },
    @Body() dto: UpsertAttendanceDto,
  ) {
    const authUserId = req.user.userId ?? req.user.id;
    if (!authUserId) {
      throw new UnauthorizedException('Utilisateur non authentifie');
    }

    return this.attendancesService.upsert(authUserId, dto);
  }
}

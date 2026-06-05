import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
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
    @Req()
    req: {
      user: { userId?: string; id?: string; role?: AppRole; appRole?: AppRole };
    },
    @Body() dto: UpsertAttendanceDto,
    @Headers('x-shared-profile') sharedProfileHeader: string | undefined,
  ) {
    const authUserId = req.user.userId ?? req.user.id;
    const authUserRole = req.user.appRole ?? req.user.role;

    if (!authUserId) {
      throw new UnauthorizedException('Utilisateur non authentifie');
    }

    const targetUserId = dto.userId ?? authUserId;
    const canManageOtherUsers =
      authUserRole === AppRole.ADMIN || authUserRole === AppRole.OFFICER;

    if (targetUserId !== authUserId && !canManageOtherUsers) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que votre propre inscription.',
      );
    }

    return this.attendancesService.upsert(
      targetUserId,
      dto,
      sharedProfileHeader,
    );
  }
}

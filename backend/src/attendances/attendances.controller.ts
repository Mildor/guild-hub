import { Body, Controller, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AttendancesService } from './attendances.service';
import { UpsertAttendanceDto } from './dto/upsert-attendance.dto';

@ApiTags('attendances')
@Controller('attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Put()
  @ApiOperation({
    summary: 'Crée ou met à jour une inscription (ACCEPTED / DECLINED / TENTATIVE / LATE)',
  })
  @ApiResponse({ status: 200, description: 'Inscription créée ou mise à jour avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 404, description: 'Événement ou personnage introuvable.' })
  upsert(@Body() dto: UpsertAttendanceDto) {
    return this.attendancesService.upsert(dto);
  }
}

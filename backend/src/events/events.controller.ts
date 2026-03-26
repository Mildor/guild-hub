import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  @ApiOperation({ summary: 'Crée un événement de raid' })
  @ApiResponse({ status: 201, description: 'Événement créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Get()
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER)
  @ApiOperation({ summary: 'Retourne les événements futurs triés par date' })
  @ApiResponse({ status: 200, description: 'Liste des événements futurs.' })
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER)
  @ApiOperation({ summary: 'Retourne un événement avec le roster complet (attendances + user + character)' })
  @ApiResponse({ status: 200, description: 'Événement trouvé avec son roster complet.' })
  @ApiResponse({ status: 404, description: 'Événement introuvable.' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  @ApiOperation({ summary: 'Met à jour un événement' })
  @ApiResponse({ status: 200, description: 'Événement mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Événement introuvable.' })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  @ApiOperation({ summary: 'Supprime un événement' })
  @ApiResponse({ status: 200, description: 'Événement supprimé avec succès.' })
  @ApiResponse({ status: 404, description: 'Événement introuvable.' })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}

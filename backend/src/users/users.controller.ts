import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER)
  @ApiOperation({ summary: 'Retourne tous les utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste de tous les utilisateurs.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER)
  @ApiOperation({ summary: 'Retourne un utilisateur avec ses personnages' })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé avec ses personnages.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: "Met à jour le rôle ou le discordId d'un utilisateur" })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour avec succès.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  @ApiResponse({ status: 403, description: 'Accès interdit — réservé aux admins.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AppRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
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
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: 'Retourne tous les utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste de tous les utilisateurs.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER)
  @ApiOperation({ summary: 'Retourne un utilisateur avec ses personnages' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur trouvé avec ses personnages.',
  })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/role')
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: "Met à jour le rôle d'un utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur mis à jour avec succès.',
  })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit — réservé aux admins.',
  })
  updateRole(
    @Req() req: Request & { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(req.user.userId, id, dto.role);
  }
}

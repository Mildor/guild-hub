import {
  Body,
  Controller,
  Delete,
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
import { AppRole, SharedProfile } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateSharedAccountDto } from './dto/update-shared-account.dto';
import { CreateSharedProfileDto } from './dto/create-shared-profile.dto';
import { RenameSharedProfileDto } from './dto/rename-shared-profile.dto';
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

  @Get('me/shared-account')
  @ApiOperation({ summary: 'Retourne la configuration de compte partage du compte connecte' })
  @ApiResponse({ status: 200, description: 'Configuration partagee retournee avec succes.' })
  getMySharedAccount(@Req() req: Request & { user: { userId: string } }) {
    return this.usersService.getMySharedAccountConfig(req.user.userId);
  }

  @Patch('me/shared-account')
  @ApiOperation({ summary: 'Active ou desactive le mode compte partage' })
  @ApiResponse({ status: 200, description: 'Configuration partagee mise a jour.' })
  updateMySharedAccount(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: UpdateSharedAccountDto,
  ) {
    return this.usersService.updateMySharedAccountConfig(
      req.user.userId,
      dto.isSharedAccount,
    );
  }

  @Patch('me/shared-account/profiles')
  @ApiOperation({ summary: 'Cree un nouveau profil partage (max 5)' })
  @ApiResponse({ status: 200, description: 'Profil partage cree avec succes.' })
  createMySharedProfile(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: CreateSharedProfileDto,
  ) {
    return this.usersService.createMySharedProfile(req.user.userId, dto.name ?? '');
  }

  @Patch('me/shared-account/profiles/:code')
  @ApiOperation({ summary: 'Renomme un profil partage existant' })
  @ApiResponse({ status: 200, description: 'Profil partage renomme avec succes.' })
  renameMySharedProfile(
    @Req() req: Request & { user: { userId: string } },
    @Param('code') code: SharedProfile,
    @Body() dto: RenameSharedProfileDto,
  ) {
    return this.usersService.renameMySharedProfile(req.user.userId, code, dto.name);
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

  @Delete('me')
  @ApiOperation({ summary: 'Supprime définitivement le compte connecté' })
  @ApiResponse({ status: 200, description: 'Compte supprimé avec succès.' })
  deleteMe(@Req() req: Request & { user: { userId: string } }) {
    return this.usersService.deleteMyAccount(req.user.userId);
  }

  @Delete(':id')
  @Roles(AppRole.ADMIN)
  @ApiOperation({ summary: 'Supprime un utilisateur (admin)' })
  @ApiResponse({ status: 200, description: 'Compte supprime avec succes.' })
  @ApiResponse({ status: 403, description: 'Acces interdit.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  deleteByAdmin(
    @Req() req: Request & { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.usersService.deleteByAdmin(req.user.userId, id);
  }
}

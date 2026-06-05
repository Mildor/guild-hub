import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { ModulesService } from './modules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER, AppRole.GUEST)
  async findAll() {
    return this.modulesService.findAll();
  }

  @Patch(':code')
  @Roles(AppRole.ADMIN)
  async update(
    @Param('code') code: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.modulesService.update(code, isActive);
  }
}

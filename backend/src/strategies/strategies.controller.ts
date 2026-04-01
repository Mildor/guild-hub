import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Express } from 'express';
import { StrategiesService } from './strategies.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('strategies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  private async validateDto<T extends object>(
    dto: any,
    type: new () => T,
  ): Promise<T> {
    if (!dto) {
      throw new BadRequestException('Request body is empty');
    }

    const instance = plainToInstance(type, dto);
    const errors = await validate(instance);
    if (errors.length > 0) {
      const messages = errors.flatMap((error) =>
        Object.values(error.constraints || {}),
      );
      throw new BadRequestException(messages);
    }
    return instance;
  }

  @Get()
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER)
  @ApiOperation({ summary: 'Retourne toutes les stratégies triées par raid puis boss' })
  @ApiResponse({ status: 200, description: 'Liste des stratégies.' })
  findAll() {
    return this.strategiesService.findAll();
  }

  @Get(':id')
  @Roles(AppRole.ADMIN, AppRole.OFFICER, AppRole.MEMBER)
  @ApiOperation({ summary: 'Retourne une stratégie par ID' })
  @ApiResponse({ status: 200, description: 'Stratégie trouvée.' })
  @ApiResponse({ status: 404, description: 'Stratégie introuvable.' })
  findOne(@Param('id') id: string) {
    return this.strategiesService.findOne(id);
  }

  @Post()
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  @UseInterceptors(FileInterceptor('imageFile'))
  @ApiOperation({ summary: 'Crée une nouvelle stratégie de boss' })
  @ApiResponse({ status: 201, description: 'Stratégie créée avec succès.' })
  @ApiResponse({ status: 403, description: 'Accès interdit.' })
  async create(
    @Req() req: { user: { userId: string }; body: any },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('📁 FormData body:', req.body);
    console.log('📄 File:', file?.originalname, file?.size, 'bytes');

    const dto = await this.validateDto(req.body, CreateStrategyDto);
    return this.strategiesService.create(req.user.userId, dto, file);
  }

  @Patch(':id')
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  @UseInterceptors(FileInterceptor('imageFile'))
  @ApiOperation({ summary: 'Met à jour une stratégie' })
  @ApiResponse({ status: 200, description: 'Stratégie mise à jour.' })
  @ApiResponse({ status: 404, description: 'Stratégie introuvable.' })
  async update(
    @Param('id') id: string,
    @Req() req: { body: any },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('📁 FormData body:', req.body);
    console.log('📄 File:', file?.originalname, file?.size, 'bytes');

    const dto = await this.validateDto(req.body, UpdateStrategyDto);
    return this.strategiesService.update(id, dto, file);
  }

  @Delete(':id')
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  @ApiOperation({ summary: 'Supprime une stratégie' })
  @ApiResponse({ status: 200, description: 'Stratégie supprimée.' })
  @ApiResponse({ status: 404, description: 'Stratégie introuvable.' })
  remove(@Param('id') id: string) {
    return this.strategiesService.remove(id);
  }
}

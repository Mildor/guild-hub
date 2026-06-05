import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads',
        // On génère un nom unique et on conserve l'extension d'origine.
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname);
          callback(null, `${uuidv4()}${extension}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload sécurisé d’une image' })
  @ApiResponse({ status: 201, description: 'Image envoyée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          // La validation s'appuie sur le mimetype déclaré par Multer.
          new FileTypeValidator({
            fileType: /(png|jpeg|jpg|webp)$/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return { url: `/uploads/${file.filename}` };
  }
}

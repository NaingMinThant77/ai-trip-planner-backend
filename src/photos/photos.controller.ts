import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { MAX_PHOTO_BYTES, PhotoDto, PhotosService, UPLOAD_ROOT, generateFileName } from './photos.service';

@Controller('trips/:tripId/photos')
@UseGuards(JwtAuthGuard)
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get()
  async list(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
  ): Promise<PhotoDto[]> {
    return this.photos.list(tripId, user.id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_ROOT,
        filename: (_req, file, cb) => cb(null, generateFileName(file.originalname)),
      }),
      limits: { fileSize: MAX_PHOTO_BYTES },
    }),
  )
  async upload(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadPhotoDto,
  ): Promise<PhotoDto> {
    if (!file) {
      throw new BadRequestException('No file was uploaded under the field name "file".');
    }
    return this.photos.upload(tripId, user.id, file, dto.caption ?? null);
  }

  @Delete(':photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: SafeUser,
    @Param('tripId') tripId: string,
    @Param('photoId') photoId: string,
  ): Promise<void> {
    await this.photos.remove(tripId, user.id, photoId);
  }
}

/**
 * Image bytes are served unauthenticated so <Image> can load them with a plain URL.
 * File names are unguessable UUIDs, which is the same posture as a signed CDN path —
 * acceptable for trip photos, not acceptable for anything genuinely sensitive.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly photos: PhotosService) {}

  @Get(':fileName')
  serve(@Param('fileName') fileName: string): StreamableFile {
    return new StreamableFile(this.photos.streamFile(fileName));
  }
}

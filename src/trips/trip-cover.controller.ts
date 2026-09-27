import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryService, MAX_TRIP_COVER_BYTES, UploadedImage } from '../media/cloudinary.service';
import { ImageGenerationService } from '../media/image-generation.service';
import { GenerateCoverDto } from './dto/generate-cover.dto';

/**
 * Produces a `coverImageUrl` before a trip exists — the New Trip form calls one of these two
 * routes first, then passes the resulting url into `POST /trips` as part of CreateTripDto.
 */
@Controller('trips/cover-image')
@UseGuards(JwtAuthGuard)
export class TripCoverController {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly imageGeneration: ImageGenerationService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_TRIP_COVER_BYTES },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File | undefined): Promise<UploadedImage> {
    if (!file) {
      throw new BadRequestException('No image was uploaded under the field name "file".');
    }
    return this.cloudinary.uploadTripCover(file);
  }

  @Post('generate')
  async generate(@Body() dto: GenerateCoverDto): Promise<UploadedImage> {
    const image = await this.imageGeneration.generateDestinationImage(dto.destination);
    return this.cloudinary.uploadTripCover(image);
  }
}

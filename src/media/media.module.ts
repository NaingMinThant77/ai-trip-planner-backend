import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { ImageGenerationService } from './image-generation.service';

/** No controller: nothing uploads directly. Feature modules import this and do it for you. */
@Module({
  providers: [CloudinaryService, ImageGenerationService],
  exports: [CloudinaryService, ImageGenerationService],
})
export class MediaModule {}

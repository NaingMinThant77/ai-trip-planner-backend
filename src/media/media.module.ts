import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/** No controller: nothing uploads directly. Feature modules import this and do it for you. */
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class MediaModule {}

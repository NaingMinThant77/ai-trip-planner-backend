import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { TripsModule } from '../trips/trips.module';
import { PhotosController, UploadsController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [TripsModule, MediaModule],
  controllers: [PhotosController, UploadsController],
  providers: [PhotosService],
})
export class PhotosModule {}

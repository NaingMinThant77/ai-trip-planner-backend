import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { PhotosController, UploadsController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [TripsModule],
  controllers: [PhotosController, UploadsController],
  providers: [PhotosService],
})
export class PhotosModule {}

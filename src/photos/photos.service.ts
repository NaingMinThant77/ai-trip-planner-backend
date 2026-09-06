import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReadStream, createReadStream, existsSync, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';

export const UPLOAD_ROOT = resolve(process.cwd(), 'uploads');

const ALLOWED_MIME = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/heic', '.heic'],
]);

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export type PhotoDto = {
  id: string;
  url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  uploadedBy: string;
};

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {
    if (!existsSync(UPLOAD_ROOT)) {
      mkdirSync(UPLOAD_ROOT, { recursive: true });
    }
  }

  async list(tripId: string, userId: string): Promise<PhotoDto[]> {
    await this.trips.findOwned(tripId, userId);
    const photos = await this.prisma.tripPhoto.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });

    return photos.map((photo) => ({
      id: photo.id,
      url: `/uploads/${photo.fileName}`,
      caption: photo.caption,
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt.toISOString(),
      uploadedBy: photo.user.name,
    }));
  }

  async upload(
    tripId: string,
    userId: string,
    file: Express.Multer.File,
    caption: string | null,
  ): Promise<PhotoDto> {
    await this.trips.findOwned(tripId, userId);

    // Trust the sniffed mime type over the filename — an extension is user-controlled.
    const extension = ALLOWED_MIME.get(file.mimetype);
    if (!extension) {
      throw new BadRequestException('Only JPEG, PNG, WebP and HEIC images are accepted.');
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Images must be 10MB or smaller.');
    }

    // multer's diskStorage already wrote the file under a generated name; keep that name.
    const fileName = file.filename;

    const photo = await this.prisma.tripPhoto.create({
      data: {
        tripId,
        userId,
        fileName,
        caption,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      },
      include: { user: { select: { name: true } } },
    });

    return {
      id: photo.id,
      url: `/uploads/${photo.fileName}`,
      caption: photo.caption,
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt.toISOString(),
      uploadedBy: photo.user.name,
    };
  }

  async remove(tripId: string, userId: string, photoId: string): Promise<void> {
    await this.trips.findOwned(tripId, userId);

    const photo = await this.prisma.tripPhoto.findFirst({ where: { id: photoId, tripId } });
    if (!photo) throw new NotFoundException('Photo not found.');

    await this.prisma.tripPhoto.delete({ where: { id: photoId } });

    // The row is the source of truth; a leftover file is untidy, not broken.
    await unlink(join(UPLOAD_ROOT, photo.fileName)).catch(() => undefined);
  }

  /** Streams a stored image. `fileName` is validated to stop path traversal. */
  streamFile(fileName: string): ReadStream {
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(fileName)) {
      throw new BadRequestException('Invalid file name.');
    }

    const path = join(UPLOAD_ROOT, fileName);
    // resolve() collapses any '..'; confirm the result is still inside the upload root.
    if (!resolve(path).startsWith(UPLOAD_ROOT) || !existsSync(path)) {
      throw new NotFoundException('File not found.');
    }

    return createReadStream(path);
  }
}

/** Used by multer's diskStorage to name incoming files. */
export function generateFileName(originalName: string): string {
  const ext = extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
  return `${randomUUID()}${ext}`;
}

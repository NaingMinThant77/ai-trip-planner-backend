import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReadStream, createReadStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { CloudinaryService } from '../media/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';

export const UPLOAD_ROOT = resolve(process.cwd(), 'uploads');

const ALLOWED_MIME = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/heic', '.heic'],
]);

/**
 * Where UploadsController serves a stored file. It sits under the global `api` prefix, so the
 * path must include it — the app prefixes only the origin (`toAbsoluteUrl`).
 */
function photoPath(fileName: string): string {
  return `/api/uploads/${fileName}`;
}

/** Cloudinary rows carry an absolute url; legacy rows fall back to the disk-serving route. */
function photoUrl(photo: { url: string | null; fileName: string }): string {
  return photo.url ?? photoPath(photo.fileName);
}

/** Content-Type for a stored file, so image loaders do not get application/octet-stream. */
export function mimeTypeFor(fileName: string): string {
  const extension = extname(fileName).toLowerCase();
  for (const [mime, ext] of ALLOWED_MIME) if (ext === extension) return mime;
  return extension === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
}

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
    private readonly cloudinary: CloudinaryService,
  ) {}

  async list(tripId: string, userId: string): Promise<PhotoDto[]> {
    await this.trips.findAccessible(tripId, userId);
    const photos = await this.prisma.tripPhoto.findMany({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });

    return photos.map((photo) => ({
      id: photo.id,
      url: photoUrl(photo),
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
    await this.trips.assertEditable(tripId, userId);

    // Trust the sniffed mime type over the filename — an extension is user-controlled.
    const extension = ALLOWED_MIME.get(file.mimetype);
    if (!extension) {
      throw new BadRequestException('Only JPEG, PNG, WebP and HEIC images are accepted.');
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Images must be 10MB or smaller.');
    }

    const uploaded = await this.cloudinary.uploadTripPhoto(file);

    const photo = await this.prisma.tripPhoto.create({
      data: {
        tripId,
        userId,
        fileName: uploaded.publicId,
        url: uploaded.url,
        publicId: uploaded.publicId,
        caption,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      },
      include: { user: { select: { name: true } } },
    });

    return {
      id: photo.id,
      url: photoUrl(photo),
      caption: photo.caption,
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt.toISOString(),
      uploadedBy: photo.user.name,
    };
  }

  async remove(tripId: string, userId: string, photoId: string): Promise<void> {
    await this.trips.assertEditable(tripId, userId);

    const photo = await this.prisma.tripPhoto.findFirst({ where: { id: photoId, tripId } });
    if (!photo) throw new NotFoundException('Photo not found.');

    await this.prisma.tripPhoto.delete({ where: { id: photoId } });

    // The row is the source of truth; a leftover file is untidy, not broken.
    if (photo.publicId) {
      await this.cloudinary.deleteImage(photo.publicId);
    } else {
      await unlink(join(UPLOAD_ROOT, photo.fileName)).catch(() => undefined);
    }
  }

  /** Streams a legacy image still stored on local disk. `fileName` is validated to stop path traversal. */
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

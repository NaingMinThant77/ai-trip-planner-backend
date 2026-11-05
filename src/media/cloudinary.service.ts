import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';

export type UploadedImage = {
  /** `secure_url` — what the client renders. */
  url: string;
  /** `public_id` — the only handle that can delete the image later. */
  publicId: string;
};

const API_BASE = 'https://api.cloudinary.com/v1_1';

/** Everything the app uploads lands here, so an account can be cleaned up in one place. */
const AVATAR_FOLDER = 'ai-trip-planner/avatars';
const TRIP_COVER_FOLDER = 'ai-trip-planner/trip-covers';
const TRIP_PHOTO_FOLDER = 'ai-trip-planner/trip-photos';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_TRIP_COVER_BYTES = 8 * 1024 * 1024;
export const MAX_TRIP_PHOTO_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

type CloudinaryUploadResponse = {
  secure_url?: unknown;
  public_id?: unknown;
  error?: { message?: unknown };
};

/**
 * The only file that talks to Cloudinary — the same containment `ai/` gives the model client.
 *
 * Uses signed REST uploads over `fetch` rather than the `cloudinary` SDK: the whole surface
 * needed here is two POSTs, and an unsigned/browser upload preset would have to be public.
 * Decision #20.
 */
@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {}

  /** False when the env vars are absent. The server still boots; uploads report it instead. */
  get isConfigured(): boolean {
    return Boolean(this.rawCloudName && this.rawApiKey && this.rawApiSecret);
  }

  async uploadAvatar(file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  }): Promise<UploadedImage> {
    return this.uploadImage(file, {
      folder: AVATAR_FOLDER,
      publicIdPrefix: 'avatar',
      maxBytes: MAX_AVATAR_BYTES,
      tooLargeMessage: 'That image is larger than 5 MB.',
    });
  }

  /** Used for both a traveller's own upload and an AI-generated cover — same folder either way. */
  async uploadTripCover(file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  }): Promise<UploadedImage> {
    return this.uploadImage(file, {
      folder: TRIP_COVER_FOLDER,
      publicIdPrefix: 'trip-cover',
      maxBytes: MAX_TRIP_COVER_BYTES,
      tooLargeMessage: 'That image is larger than 8 MB.',
    });
  }

  /** A photo added to a trip's Photos tab. */
  async uploadTripPhoto(file: {
    buffer: Buffer;
    mimetype: string;
    size: number;
  }): Promise<UploadedImage> {
    return this.uploadImage(file, {
      folder: TRIP_PHOTO_FOLDER,
      publicIdPrefix: 'trip-photo',
      maxBytes: MAX_TRIP_PHOTO_BYTES,
      tooLargeMessage: 'Images must be 10MB or smaller.',
    });
  }

  private async uploadImage(
    file: { buffer: Buffer; mimetype: string; size: number },
    options: { folder: string; publicIdPrefix: string; maxBytes: number; tooLargeMessage: string },
  ): Promise<UploadedImage> {
    this.assertConfigured();

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Upload a JPEG, PNG, WebP or HEIC image.');
    }
    // Multer's own limit rejects most of these first; this covers a caller that bypasses it.
    if (file.size > options.maxBytes) {
      throw new BadRequestException(options.tooLargeMessage);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // A fresh id per upload rather than one keyed by owner: replacing an image then has a
    // window where both exist, so a failed delete cannot leave the caller with nothing.
    const publicId = `${options.publicIdPrefix}-${randomUUID()}`;
    const { folder } = options;

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }));
    form.append('api_key', this.apiKey);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('public_id', publicId);
    form.append('signature', this.sign({ folder, public_id: publicId, timestamp: String(timestamp) }));

    const response = await fetch(`${API_BASE}/${this.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });

    const body = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;

    if (!response.ok) {
      // Cloudinary's message names the misconfiguration ("Invalid signature", "Unknown API
      // key"), and carries no secret, so it is worth passing through.
      const detail = typeof body.error?.message === 'string' ? ` ${body.error.message}` : '';
      throw new BadRequestException(`Cloudinary rejected the upload.${detail}`);
    }

    const url = typeof body.secure_url === 'string' ? body.secure_url : null;
    const returnedId = typeof body.public_id === 'string' ? body.public_id : null;
    if (!url || !returnedId) {
      throw new BadRequestException('Cloudinary did not return an image URL.');
    }

    return { url, publicId: returnedId };
  }

  /**
   * Best-effort by design: the caller has already pointed the user at the new image, so a
   * failure here must not fail their request. Returns whether the delete actually happened.
   */
  async deleteImage(publicId: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    const timestamp = Math.floor(Date.now() / 1000);

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('api_key', this.apiKey);
    form.append('timestamp', String(timestamp));
    // Without this the asset is deleted but any edge that already served it keeps doing so,
    // so a removed photo stays fetchable at its old URL for a while. Signed like the rest.
    form.append('invalidate', 'true');
    form.append(
      'signature',
      this.sign({ invalidate: 'true', public_id: publicId, timestamp: String(timestamp) }),
    );

    try {
      const response = await fetch(`${API_BASE}/${this.cloudName}/image/destroy`, {
        method: 'POST',
        body: form,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Cloudinary's signature: the signed parameters sorted by name, joined as a query string,
   * with the API secret appended, hashed with SHA-1. `file` and `api_key` are never signed.
   */
  private sign(params: Record<string, string>): string {
    const payload = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    return createHash('sha1')
      .update(payload + this.apiSecret)
      .digest('hex');
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Image uploads are not configured on the server. Set the CLOUDINARY_* env vars.',
      );
    }
  }

  private get cloudName(): string {
    return this.rawCloudName ?? '';
  }

  private get apiKey(): string {
    return this.rawApiKey ?? '';
  }

  private get apiSecret(): string {
    return this.rawApiSecret ?? '';
  }

  private get rawCloudName(): string | undefined {
    return this.config.get<string>('CLOUDINARY_CLOUD_NAME');
  }

  private get rawApiKey(): string | undefined {
    return this.config.get<string>('CLOUDINARY_API_KEY');
  }

  private get rawApiSecret(): string | undefined {
    return this.config.get<string>('CLOUDINARY_API_SECRET');
  }
}

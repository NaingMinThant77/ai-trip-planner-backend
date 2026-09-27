import { Injectable, ServiceUnavailableException } from '@nestjs/common';

/** Pollinations' free queue alone can take 40s+ before generation starts. */
const REQUEST_TIMEOUT_MS = 100_000;
/** Pollinations rejects seeds above a signed 32-bit int, so `Date.now()` is too large. */
const MAX_SEED = 2_147_483_647;
const IMAGE_SIZE = 1024;

export type GeneratedImage = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

/**
 * Text-to-image via Pollinations.ai — a free, keyless public endpoint. No account, no billing,
 * no SLA: good enough for a trip cover placeholder, not something to build a paid feature on.
 * If this needs to become reliable later, swap it for a paid provider behind this same method.
 */
@Injectable()
export class ImageGenerationService {
  async generateDestinationImage(destination: string): Promise<GeneratedImage> {
    const prompt = [
      `Scenic travel photograph of ${destination}`,
      'iconic landmarks, golden hour lighting, vibrant colours, travel poster style, no text, no watermark',
    ].join(', ');

    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${IMAGE_SIZE}&height=${IMAGE_SIZE}&nologo=true&seed=${Math.floor(Math.random() * MAX_SEED)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ServiceUnavailableException('The image generator did not respond in time.');
      }
      throw new ServiceUnavailableException(
        `Could not reach the image generator: ${(error as Error).message}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('The image generator could not create an image.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimetype = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';

    return { buffer, mimetype, size: buffer.byteLength };
  }
}

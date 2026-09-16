import {
  coverVariant,
  eventVariant,
  logoVariants,
  mediaLimits,
  photoVariants,
} from '@sds/image-processing-config';

export type BusinessMediaRole = 'logo' | 'cover' | 'gallery';
export type ProcessableMediaRole = BusinessMediaRole | 'offering' | 'event';

export interface ProcessedVariant {
  blob: Blob;
  height: number;
  variant: string;
  width: number;
}

const roleSpecs = {
  logo: [
    {
      variant: 'logo_small',
      maxDimension: logoVariants.small,
      quality: 0.82,
      targetBytes: 80 * 1024,
    },
    {
      variant: 'logo_standard',
      maxDimension: logoVariants.standard,
      quality: 0.84,
      targetBytes: 120 * 1024,
    },
    {
      variant: 'logo_high_density',
      maxDimension: logoVariants.highDensity,
      quality: 0.86,
      targetBytes: 200 * 1024,
    },
  ],
  cover: [
    {
      variant: 'cover',
      maxDimension: coverVariant.maxWidth,
      quality: coverVariant.quality / 100,
      targetBytes: coverVariant.targetMaxBytes,
    },
  ],
  gallery: Object.entries(photoVariants).map(([variant, spec]) => ({
    variant,
    maxDimension: spec.maxDimension,
    quality: spec.quality / 100,
    targetBytes: spec.targetMaxBytes,
  })),
  offering: Object.entries(photoVariants).map(([variant, spec]) => ({
    variant,
    maxDimension: spec.maxDimension,
    quality: spec.quality / 100,
    targetBytes: spec.targetMaxBytes,
  })),
  event: [
    {
      variant: 'event_card',
      maxDimension: eventVariant.maxDimension,
      quality: eventVariant.quality / 100,
      targetBytes: eventVariant.targetMaxBytes,
    },
  ],
} satisfies Record<
  ProcessableMediaRole,
  { variant: string; maxDimension: number; quality: number; targetBytes: number }[]
>;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Your browser could not create a WebP image.')),
      'image/webp',
      quality,
    );
  });
}

export async function processBusinessImage(file: File, role: ProcessableMediaRole) {
  if (file.size > mediaLimits.maxSourceBytes)
    throw new Error('Choose an image smaller than 15 MB.');
  if (
    !mediaLimits.acceptedRasterMimeTypes.includes(
      file.type as (typeof mediaLimits.acceptedRasterMimeTypes)[number],
    )
  ) {
    throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
  }

  let source: ImageBitmap;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(
      'This browser could not read that image. If it is HEIC, export it as JPEG first.',
    );
  }
  try {
    if (source.width * source.height > mediaLimits.maxSourcePixels)
      throw new Error('Choose an image smaller than 48 megapixels.');

    const output: ProcessedVariant[] = [];
    for (const spec of roleSpecs[role]) {
      const scale = Math.min(1, spec.maxDimension / Math.max(source.width, source.height));
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new Error('Your browser could not prepare the image.');
      context.drawImage(source, 0, 0, width, height);

      let quality = spec.quality;
      let blob = await canvasBlob(canvas, quality);
      while (blob.size > spec.targetBytes && quality > 0.56) {
        quality -= 0.08;
        blob = await canvasBlob(canvas, quality);
      }
      output.push({ blob, height, variant: spec.variant, width });
    }
    return output;
  } finally {
    source.close();
  }
}

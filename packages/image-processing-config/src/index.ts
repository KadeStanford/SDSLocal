export const mediaLimits = {
  maxSourceBytes: 15 * 1024 * 1024,
  maxSourcePixels: 48_000_000,
  maxGalleryImages: 10,
  maxStaffUsers: 3,
  targetBusinessBytes: 20 * 1024 * 1024,
  reviewBusinessBytes: 50 * 1024 * 1024,
  acceptedRasterMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
} as const;

export const photoVariants = {
  thumbnail: { maxDimension: 320, quality: 80, targetMaxBytes: 60 * 1024 },
  card: { maxDimension: 800, quality: 82, targetMaxBytes: 150 * 1024 },
  full: { maxDimension: 1600, quality: 84, targetMaxBytes: 400 * 1024 },
} as const;

export const logoVariants = {
  small: 128,
  standard: 256,
  highDensity: 512,
} as const;

export const coverVariant = {
  maxWidth: 1920,
  quality: 84,
  targetMaxBytes: 450 * 1024,
} as const;

export const eventVariant = {
  maxDimension: 1200,
  quality: 82,
  targetMaxBytes: 250 * 1024,
} as const;

export type PhotoVariantName = keyof typeof photoVariants;

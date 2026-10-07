import { mediaLimits } from '@sds/image-processing-config';

/** Validate the local selection before displaying a draft or creating an upload intent. */
export function imageSelectionError(asset: {
  mimeType?: string | undefined;
  fileSize?: number | undefined;
  width: number;
  height: number;
}): string | null {
  const mime = asset.mimeType?.toLowerCase() ?? 'image/jpeg';
  if (
    !mediaLimits.acceptedRasterMimeTypes.includes(
      mime as (typeof mediaLimits.acceptedRasterMimeTypes)[number],
    )
  )
    return 'Choose a JPEG, PNG, WebP, HEIC, or HEIF image.';
  if (asset.fileSize && asset.fileSize > mediaLimits.maxSourceBytes)
    return 'Choose an image smaller than 15 MB.';
  if (asset.width * asset.height > mediaLimits.maxSourcePixels)
    return 'Choose an image smaller than 48 megapixels.';
  return null;
}

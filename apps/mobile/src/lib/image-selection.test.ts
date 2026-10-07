import { expect, it } from 'vitest';
import { mediaLimits } from '@sds/image-processing-config';
import { imageSelectionError } from './image-selection';
const photo = { width: 1200, height: 1600, mimeType: 'image/jpeg', fileSize: 1200000 };
it('allows supported local item photos including iPhone HEIC before upload', () => {
  for (const mimeType of mediaLimits.acceptedRasterMimeTypes)
    expect(imageSelectionError({ ...photo, mimeType })).toBeNull();
  expect(imageSelectionError({ width: 1200, height: 1600 })).toBeNull();
});
it('rejects unsupported formats, oversized files and excessive pixel counts before saving', () => {
  expect(imageSelectionError({ ...photo, mimeType: 'image/svg+xml' })).toContain('Choose a JPEG');
  expect(imageSelectionError({ ...photo, fileSize: mediaLimits.maxSourceBytes + 1 })).toContain(
    '15 MB',
  );
  expect(imageSelectionError({ ...photo, width: 9000, height: 9000 })).toContain('48 megapixels');
});

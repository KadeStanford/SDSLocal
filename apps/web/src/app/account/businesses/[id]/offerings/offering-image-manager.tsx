'use client';

import { mediaLimits } from '@sds/image-processing-config';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import { processBusinessImage } from '../media/image-processing';

interface OfferingImageManagerProps {
  readonly businessId: string;
  readonly businessName: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly userId: string;
  readonly currentImage: { altText: string | null; url: string } | null;
}

export function OfferingImageManager({
  businessId,
  businessName,
  itemId,
  itemName,
  userId,
  currentImage,
}: OfferingImageManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [altText, setAltText] = useState(currentImage?.altText ?? `${itemName} at ${businessName}`);

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setMessage('Optimizing image…');
    const supabase = createClient();
    const assetGroupId = crypto.randomUUID();
    const stagedPaths: string[] = [];
    try {
      const variants = await processBusinessImage(file, 'offering');
      setMessage('Uploading optimized versions…');
      for (const variant of variants) {
        const path = `${userId}/${businessId}/${assetGroupId}/${variant.variant}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('media-staging')
          .upload(path, variant.blob, {
            cacheControl: '3600',
            contentType: 'image/webp',
            upsert: false,
          });
        if (uploadError) throw uploadError;
        stagedPaths.push(path);
      }

      setMessage('Verifying and publishing…');
      const { data, error: invokeError } = await supabase.functions.invoke(
        'finalize-business-image',
        {
          body: {
            altText: altText.trim() || `${itemName} at ${businessName}`,
            assetGroupId,
            businessId,
            role: 'offering',
            targetId: itemId,
            variants: variants.map((variant, index) => ({
              path: stagedPaths[index],
              variant: variant.variant,
            })),
          },
        },
      );
      if (invokeError) {
        const details =
          typeof data === 'object' && data && 'error' in data
            ? String(data.error)
            : invokeError.message;
        throw new Error(details);
      }
      setMessage('Item image published.');
      router.refresh();
    } catch (caught) {
      if (stagedPaths.length) await supabase.storage.from('media-staging').remove(stagedPaths);
      setMessage('');
      setError(caught instanceof Error ? caught.message : 'The image could not be uploaded.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="offering-image-manager">
      {currentImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentImage.url} alt={currentImage.altText ?? ''} />
      )}
      <label>
        Image description
        <input
          value={altText}
          maxLength={240}
          onChange={(event) => setAltText(event.target.value)}
        />
      </label>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={mediaLimits.acceptedRasterMimeTypes.join(',')}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        className="button button-secondary button-small"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Processing…' : currentImage ? 'Replace item image' : 'Add item image'}
      </button>
      <span className="form-success" aria-live="polite">
        {message}
      </span>
      <span className="form-error" role="alert">
        {error}
      </span>
    </div>
  );
}

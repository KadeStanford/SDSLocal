'use client';
import { ActionButton } from '@/components/shared-ui';

import { mediaLimits } from '@sds/image-processing-config';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import { processBusinessImage } from '../media/image-processing';

interface EventImageManagerProps {
  readonly businessId: string;
  readonly businessName: string;
  readonly eventId: string;
  readonly eventTitle: string;
  readonly userId: string;
  readonly currentImage: { altText: string | null; url: string } | null;
}

export function EventImageManager({
  businessId,
  businessName,
  eventId,
  eventTitle,
  userId,
  currentImage,
}: EventImageManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [altText, setAltText] = useState(
    currentImage?.altText ?? `${eventTitle} at ${businessName}`,
  );

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setMessage('Optimizing image…');
    const supabase = createClient();
    const assetGroupId = crypto.randomUUID();
    const stagedPaths: string[] = [];
    try {
      const variants = await processBusinessImage(file, 'event');
      setMessage('Uploading optimized image…');
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
            altText: altText.trim() || `${eventTitle} at ${businessName}`,
            assetGroupId,
            businessId,
            role: 'event',
            targetId: eventId,
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
      setMessage('Event image published.');
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
    <div className="event-image-manager">
      {currentImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentImage.url} alt={currentImage.altText ?? ''} />
      )}
      <label>
        Image description
        <input
          value={altText}
          maxLength={240}
          onChange={(changeEvent) => setAltText(changeEvent.target.value)}
        />
      </label>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={mediaLimits.acceptedRasterMimeTypes.join(',')}
        disabled={busy}
        onChange={(changeEvent) => {
          const file = changeEvent.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <ActionButton
        className="button-secondary button-small"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Processing…' : currentImage ? 'Replace event image' : 'Add event image'}
      </ActionButton>
      <span className="form-success" aria-live="polite">
        {message}
      </span>
      <span className="form-error" role="alert">
        {error}
      </span>
    </div>
  );
}

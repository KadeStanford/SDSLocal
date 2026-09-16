'use client';

import { mediaLimits } from '@sds/image-processing-config';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import { type BusinessMediaRole, processBusinessImage } from './image-processing';

export interface ExistingBusinessPhoto {
  altText: string | null;
  id: string;
  role: BusinessMediaRole;
  url: string;
}

export function MediaManager({
  businessId,
  businessName,
  initialPhotos,
  userId,
}: {
  businessId: string;
  businessName: string;
  initialPhotos: ExistingBusinessPhoto[];
  userId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<BusinessMediaRole>('gallery');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [altText, setAltText] = useState('');

  const choose = (nextRole: BusinessMediaRole) => {
    setRole(nextRole);
    setError('');
    setMessage('');
    inputRef.current?.click();
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setMessage('Optimizing image…');
    const supabase = createClient();
    const assetGroupId = crypto.randomUUID();
    const stagedPaths: string[] = [];
    try {
      const variants = await processBusinessImage(file, role);
      setMessage(
        `Uploading ${variants.length} optimized ${variants.length === 1 ? 'version' : 'versions'}…`,
      );
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
            altText: altText.trim() || `${businessName} ${role}`,
            assetGroupId,
            businessId,
            role,
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
      setMessage('Photo published.');
      setAltText('');
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

  const galleryCount = initialPhotos.filter((photo) => photo.role === 'gallery').length;
  return (
    <div className="media-manager">
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
      <label className="media-alt-field">
        Image description
        <input
          value={altText}
          maxLength={240}
          onChange={(event) => setAltText(event.target.value)}
          placeholder={`Example: The front counter at ${businessName}`}
        />
        <span className="field-hint">
          Used by screen readers. We’ll add a simple default if left blank.
        </span>
      </label>
      <div className="media-actions">
        <button className="button" type="button" disabled={busy} onClick={() => choose('logo')}>
          {initialPhotos.some((photo) => photo.role === 'logo') ? 'Replace logo' : 'Add logo'}
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={busy}
          onClick={() => choose('cover')}
        >
          {initialPhotos.some((photo) => photo.role === 'cover') ? 'Replace cover' : 'Add cover'}
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={busy || galleryCount >= mediaLimits.maxGalleryImages}
          onClick={() => choose('gallery')}
        >
          Add gallery photo ({galleryCount}/{mediaLimits.maxGalleryImages})
        </button>
      </div>
      <p className="form-success" aria-live="polite">
        {message}
      </p>
      <p className="form-error" role="alert">
        {error}
      </p>
      {initialPhotos.length ? (
        <div className="media-grid">
          {initialPhotos.map((photo) => (
            <figure key={photo.id} className={`media-card media-card-${photo.role}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.altText ?? ''} />
              <figcaption>{photo.role}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No photos yet</strong>
          <span>Add a logo, cover, or gallery image to bring the page to life.</span>
        </div>
      )}
    </div>
  );
}

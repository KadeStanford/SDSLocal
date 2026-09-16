'use client';

import type { EventLocationMode, EventTimezone } from '@sds/validation';
import { useState } from 'react';

import { eventTimezoneOptions } from '@/lib/event-time';

interface EventFieldsProps {
  readonly publication?: {
    mode: 'draft' | 'publish' | 'schedule';
    publishAt: string;
  };
  readonly event?: {
    title: string;
    slug: string;
    description: string;
    startsAt: string;
    endsAt: string;
    timezone: EventTimezone;
    locationMode: EventLocationMode;
    addressText: string;
    externalUrl: string;
    ageNote: string;
    capacityText: string;
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export function EventFields({ event, publication }: EventFieldsProps) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [slug, setSlug] = useState(event?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(event));
  const [locationMode, setLocationMode] = useState<EventLocationMode>(
    event?.locationMode ?? 'business',
  );
  const [publicationMode, setPublicationMode] = useState(publication?.mode ?? 'draft');

  return (
    <>
      <p className="required-fields-note">
        <strong>Required:</strong> title, public URL name, description, start time, time zone, and
        location type. An event address is required only when you choose “Different address.”
      </p>
      <div className="form-row two-columns">
        <label>
          Event title <span className="required-marker">Required</span>
          <input
            name="title"
            value={title}
            minLength={2}
            maxLength={160}
            required
            onChange={(changeEvent) => {
              setTitle(changeEvent.target.value);
              if (!slugEdited) setSlug(slugify(changeEvent.target.value));
            }}
          />
        </label>
        <label>
          Public URL name <span className="required-marker">Required</span>
          <input
            name="slug"
            value={slug}
            maxLength={100}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
            onChange={(changeEvent) => {
              setSlugEdited(true);
              setSlug(slugify(changeEvent.target.value));
            }}
          />
          <span className="field-hint">
            Created automatically; lowercase letters and hyphens only.
          </span>
        </label>
      </div>
      <label>
        Description <span className="required-marker">Required</span>
        <textarea
          name="description"
          defaultValue={event?.description ?? ''}
          minLength={10}
          maxLength={5000}
          rows={5}
          required
        />
        <span className="field-hint">At least 10 characters.</span>
      </label>
      <div className="form-row">
        <label>
          Starts <span className="required-marker">Required</span>
          <input name="startsAt" type="datetime-local" defaultValue={event?.startsAt} required />
        </label>
        <label>
          Ends <span className="optional-marker">Optional</span>
          <input name="endsAt" type="datetime-local" defaultValue={event?.endsAt} />
        </label>
        <label>
          Time zone <span className="required-marker">Required</span>
          <select name="timezone" defaultValue={event?.timezone ?? 'America/Chicago'}>
            {eventTimezoneOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="publication-choice">
        <legend>What should happen when you save?</legend>
        <div className="form-row two-columns">
          <label>
            Publishing choice <span className="required-marker">Required</span>
            <select
              name="publicationMode"
              value={publicationMode}
              onChange={(changeEvent) =>
                setPublicationMode(changeEvent.target.value as 'draft' | 'publish' | 'schedule')
              }
            >
              <option value="draft">Save as a private draft</option>
              <option value="publish">Publish now</option>
              <option value="schedule">Schedule publishing</option>
            </select>
          </label>
          {publicationMode === 'schedule' && (
            <label>
              Publish date and time <span className="required-marker">Required</span>
              <input
                name="publishAt"
                type="datetime-local"
                defaultValue={publication?.publishAt ?? ''}
                required
              />
              <span className="field-hint">Uses the event time zone selected above.</span>
            </label>
          )}
        </div>
      </fieldset>
      <div className="form-row two-columns">
        <label>
          Location type <span className="required-marker">Required</span>
          <select
            name="locationMode"
            value={locationMode}
            onChange={(changeEvent) =>
              setLocationMode(changeEvent.target.value as EventLocationMode)
            }
          >
            <option value="business">At the business address</option>
            <option value="custom">Different address</option>
            <option value="online">Online event</option>
          </select>
        </label>
        {locationMode === 'custom' && (
          <label>
            Event address <span className="required-marker">Required</span>
            <input
              name="addressText"
              defaultValue={event?.addressText ?? ''}
              maxLength={320}
              required
            />
          </label>
        )}
      </div>
      <div className="form-row">
        <label>
          Ticket or information URL <span className="optional-marker">Optional</span>
          <input name="externalUrl" type="url" defaultValue={event?.externalUrl ?? ''} />
          <span className="field-hint">Include https:// when provided.</span>
        </label>
        <label>
          Age note <span className="optional-marker">Optional</span>
          <input
            name="ageNote"
            defaultValue={event?.ageNote ?? ''}
            maxLength={120}
            placeholder="All ages"
          />
        </label>
        <label>
          Capacity note <span className="optional-marker">Optional</span>
          <input
            name="capacityText"
            defaultValue={event?.capacityText ?? ''}
            maxLength={120}
            placeholder="Limited to 50 guests"
          />
        </label>
      </div>
    </>
  );
}

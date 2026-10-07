'use client';
import { ActionButton } from '@/components/shared-ui';

import { useState } from 'react';

interface EventFiltersProps {
  readonly categories: readonly { id: number; name: string }[];
  readonly initial: {
    range: string;
    category: string;
    city: string;
    radius: string;
    latitude: string;
    longitude: string;
  };
}

export function EventFilters({ categories, initial }: EventFiltersProps) {
  const [latitude, setLatitude] = useState(initial.latitude);
  const [longitude, setLongitude] = useState(initial.longitude);
  const [locationMessage, setLocationMessage] = useState(
    initial.latitude && initial.longitude ? 'Using your current location.' : '',
  );

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser. Use a city instead.');
      return;
    }
    setLocationMessage('Requesting location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setLocationMessage('Current location added.');
      },
      () => setLocationMessage('Location was not shared. You can still search by city.'),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  };

  return (
    <form action="/events" className="event-filter-form">
      <fieldset className="event-date-shortcuts">
        <legend>When</legend>
        {[
          ['upcoming', 'All upcoming'],
          ['today', 'Today'],
          ['weekend', 'This weekend'],
          ['30days', 'Next 30 days'],
        ].map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="range"
              value={value}
              defaultChecked={initial.range === value}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <details
        className="event-refine"
        open={!!(initial.category || initial.city || initial.radius || initial.latitude)}
      >
        <summary>Location and categories</summary>
        <div className="event-refine-fields">
          <label>
            Category
            <select aria-label="Category" name="category" defaultValue={initial.category}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            City
            <input
              aria-label="City"
              name="city"
              defaultValue={initial.city}
              maxLength={120}
              placeholder="Clinton"
            />
          </label>
          <label>
            Distance
            <select aria-label="Distance" name="radius" defaultValue={initial.radius}>
              <option value="">Any distance</option>
              <option value="5">Within 5 miles</option>
              <option value="10">Within 10 miles</option>
              <option value="25">Within 25 miles</option>
              <option value="50">Within 50 miles</option>
            </select>
          </label>
        </div>
        <ActionButton className="button-secondary" type="button" onClick={requestLocation}>
          Use my location
        </ActionButton>
        <p className="field-hint" aria-live="polite">
          {locationMessage || 'Location is optional; you can search by city.'}
        </p>
      </details>
      <input type="hidden" name="lat" value={latitude} />
      <input type="hidden" name="lng" value={longitude} />
      <div className="event-filter-actions">
        <ActionButton type="submit">Find events</ActionButton>
      </div>
    </form>
  );
}

'use client';

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
      <label>
        When
        <select name="range" defaultValue={initial.range}>
          <option value="upcoming">All upcoming</option>
          <option value="today">Today</option>
          <option value="weekend">This weekend</option>
          <option value="30days">Next 30 days</option>
        </select>
      </label>
      <label>
        Category
        <select name="category" defaultValue={initial.category}>
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
        <input name="city" defaultValue={initial.city} maxLength={120} placeholder="Clinton" />
      </label>
      <label>
        Distance
        <select name="radius" defaultValue={initial.radius}>
          <option value="">Any distance</option>
          <option value="5">Within 5 miles</option>
          <option value="10">Within 10 miles</option>
          <option value="25">Within 25 miles</option>
          <option value="50">Within 50 miles</option>
        </select>
      </label>
      <input type="hidden" name="lat" value={latitude} />
      <input type="hidden" name="lng" value={longitude} />
      <div className="event-filter-actions">
        <button className="button" type="submit">
          Find events
        </button>
        <button className="button button-secondary" type="button" onClick={requestLocation}>
          Use my location
        </button>
      </div>
      <p className="field-hint" aria-live="polite">
        {locationMessage || 'Location is optional; a manual city works without permission.'}
      </p>
    </form>
  );
}

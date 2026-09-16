'use client';

import { useState } from 'react';

interface ExploreFiltersProps {
  readonly categories: readonly { id: number; name: string }[];
  readonly initial: {
    query: string;
    category: string;
    city: string;
    radius: string;
    latitude: string;
    longitude: string;
    openNow: boolean;
    loyalty: boolean;
    events: boolean;
  };
}

export function ExploreFilters({ categories, initial }: ExploreFiltersProps) {
  const [latitude, setLatitude] = useState(initial.latitude);
  const [longitude, setLongitude] = useState(initial.longitude);
  const [locationMessage, setLocationMessage] = useState(
    initial.latitude && initial.longitude ? 'Using your current location.' : '',
  );

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is unavailable here. Search by city instead.');
      return;
    }
    setLocationMessage('Requesting location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setLocationMessage('Current location added. Select Search businesses to apply it.');
      },
      () => setLocationMessage('Location was not shared. You can still search by city.'),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  };

  return (
    <form action="/explore" className="explore-filter-form">
      <label className="explore-search-field">
        What are you looking for?
        <input
          name="q"
          defaultValue={initial.query}
          maxLength={120}
          placeholder="Coffee, oil change, live music…"
        />
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
      <fieldset className="explore-toggle-group">
        <legend>Show businesses with</legend>
        <label>
          <input name="open" type="checkbox" defaultChecked={initial.openNow} /> Open now
        </label>
        <label>
          <input name="loyalty" type="checkbox" defaultChecked={initial.loyalty} /> Loyalty rewards
        </label>
        <label>
          <input name="events" type="checkbox" defaultChecked={initial.events} /> Upcoming events
        </label>
      </fieldset>
      <div className="event-filter-actions">
        <button className="button" type="submit">
          Search businesses
        </button>
        <button className="button button-secondary" type="button" onClick={requestLocation}>
          Use my location
        </button>
      </div>
      <p className="field-hint" aria-live="polite">
        {locationMessage || 'Location is optional; a city search works without permission.'}
      </p>
    </form>
  );
}

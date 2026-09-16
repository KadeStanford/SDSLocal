'use client';

import type { ServiceAreaType } from '@sds/types';
import { useState } from 'react';

const radiusOptions = [5, 10, 15, 25, 50, 100] as const;

interface ServiceAreaFieldsProps {
  readonly defaultType?: ServiceAreaType;
  readonly defaultRegions?: readonly string[];
  readonly defaultRadius?: number | null;
  readonly defaultCustomArea?: string | null;
  readonly selectedRegionCode?: string;
}

export function ServiceAreaFields({
  defaultType = 'at_location',
  defaultRegions = [],
  defaultRadius = 25,
  defaultCustomArea = '',
  selectedRegionCode = '',
}: ServiceAreaFieldsProps) {
  const [type, setType] = useState<ServiceAreaType>(defaultType);
  const [cities, setCities] = useState<string[]>(
    defaultRegions.length ? [...defaultRegions] : [''],
  );

  return (
    <div className="service-area-fields">
      <label>
        Service area
        <select
          name="serviceAreaType"
          value={type}
          onChange={(event) => setType(event.target.value as ServiceAreaType)}
        >
          <option value="at_location">Customers come to my listed location</option>
          <option value="radius">Within a radius of my listed location</option>
          <option value="cities">Specific cities</option>
          <option value="statewide">Entire state</option>
          <option value="custom">Custom service area</option>
        </select>
      </label>

      {type === 'at_location' && (
        <p className="field-hint">Your business address will be shown as the place you serve.</p>
      )}

      {type === 'radius' && (
        <label>
          Service radius
          <select name="serviceRadiusMiles" defaultValue={String(defaultRadius ?? 25)}>
            {radiusOptions.map((miles) => (
              <option value={miles} key={miles}>
                Within {miles} miles
              </option>
            ))}
          </select>
          <span className="field-hint">Measured from the business address.</span>
        </label>
      )}

      {type === 'cities' && (
        <div className="city-service-list">
          <span className="field-label">Cities served</span>
          {cities.map((city, index) => (
            <div className="city-service-row" key={index}>
              <label>
                <span className="visually-hidden">City {index + 1}</span>
                <input
                  name="serviceAreaRegions"
                  value={city}
                  maxLength={100}
                  required
                  placeholder="City name"
                  onChange={(event) =>
                    setCities((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                />
              </label>
              {cities.length > 1 && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setCities((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {cities.length < 25 && (
            <button
              className="text-button service-area-add"
              type="button"
              onClick={() => setCities((current) => [...current, ''])}
            >
              + Add another city
            </button>
          )}
        </div>
      )}

      {type === 'statewide' && (
        <p className="service-area-summary">
          {selectedRegionCode
            ? `Your business serves the entire state selected above (${selectedRegionCode}).`
            : 'Select a state above to use statewide service.'}
        </p>
      )}

      {type === 'custom' && (
        <label>
          Describe the area
          <textarea
            name="serviceArea"
            defaultValue={defaultCustomArea ?? ''}
            maxLength={240}
            rows={3}
            required
            placeholder="For example: Parishes along the I-10 corridor"
          />
          <span className="field-hint">Use this only when the choices above do not fit.</span>
        </label>
      )}
    </div>
  );
}

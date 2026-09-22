'use client';

import type { BusinessType, ServiceAreaType } from '@sds/types';
import { usRegionOptions } from '@sds/validation';
import type { EventTimezone } from '@sds/validation';
import { useActionState, useState } from 'react';

import { ServiceAreaFields } from '../../service-area-fields';
import { eventTimezoneOptions } from '@/lib/event-time';
import { type BusinessDetailsFormState, updateBusinessDetailsAction } from './actions';

interface BusinessDetails {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly business_type: BusinessType;
  readonly description: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website_url: string | null;
  readonly address_line_1: string | null;
  readonly address_line_2: string | null;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly postal_code: string | null;
  readonly service_area_type: ServiceAreaType;
  readonly service_area_regions: readonly string[];
  readonly service_radius_miles: number | null;
  readonly service_area: string | null;
  readonly primary_color: string;
  readonly accent_color: string;
  readonly page_theme: 'light' | 'dark';
  readonly font_pair: 'friendly_sans' | 'modern_sans' | 'classic_serif';
  readonly button_style: 'rounded' | 'soft' | 'square';
  readonly timezone: EventTimezone;
}

interface Category {
  readonly id: number;
  readonly name: string;
  readonly business_type: BusinessType | null;
}

interface BusinessHour {
  readonly day_of_week: number;
  readonly opens_at: string | null;
  readonly closes_at: string | null;
  readonly is_closed: boolean;
}

interface BusinessDetailsFormProps {
  readonly business: BusinessDetails;
  readonly categories: readonly Category[];
  readonly selectedCategoryIds: readonly number[];
  readonly hours: readonly BusinessHour[];
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeValue(value: string | null, fallback: string) {
  return value?.slice(0, 5) ?? fallback;
}

export function BusinessDetailsForm({
  business,
  categories,
  selectedCategoryIds: initialCategoryIds,
  hours,
}: BusinessDetailsFormProps) {
  const [state, action, pending] = useActionState<BusinessDetailsFormState, FormData>(
    updateBusinessDetailsAction,
    {},
  );
  const [businessType, setBusinessType] = useState<BusinessType>(business.business_type);
  const [regionCode, setRegionCode] = useState(business.region_code ?? '');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([...initialCategoryIds]);
  const [closedDays, setClosedDays] = useState<Record<number, boolean>>(
    Object.fromEntries(
      dayNames.map((_, day) => [
        day,
        hours.find((hour) => hour.day_of_week === day)?.is_closed ?? true,
      ]),
    ),
  );
  const errors = state.errors ? Object.values(state.errors).flat() : [];
  const matchingCategories = categories.filter(
    (category) => category.business_type === null || category.business_type === businessType,
  );

  return (
    <form action={action} className="form-stack onboarding-form settings-form">
      <input type="hidden" name="businessId" value={business.id} />

      <fieldset className="panel">
        <legend>Business basics</legend>
        <div className="form-row two-columns">
          <label>
            Business name
            <input
              name="name"
              defaultValue={business.name}
              minLength={2}
              maxLength={120}
              required
            />
          </label>
          <label>
            Page address
            <span className="input-prefix">
              <span>/b/</span>
              <input
                name="slug"
                defaultValue={business.slug}
                minLength={3}
                maxLength={80}
                required
              />
            </span>
          </label>
        </div>
        <label>
          Business type
          <select
            name="businessType"
            value={businessType}
            onChange={(event) => {
              setBusinessType(event.target.value as BusinessType);
              setSelectedCategoryIds([]);
            }}
          >
            <option value="food_drink">Food & drink</option>
            <option value="services">Services</option>
            <option value="retail">Retail</option>
            <option value="entertainment_venue">Entertainment or venue</option>
            <option value="mobile">Mobile business (food truck, pop-up, traveling service)</option>
            <option value="general">General</option>
          </select>
        </label>
        <label>
          Description
          <textarea
            name="description"
            defaultValue={business.description}
            rows={6}
            maxLength={2000}
          />
        </label>
      </fieldset>

      <fieldset className="panel">
        <legend>Categories</legend>
        <div className="checkbox-grid">
          {matchingCategories.map((category) => (
            <label className="checkbox-card" key={category.id}>
              <input
                name="categoryIds"
                type="checkbox"
                value={category.id}
                checked={selectedCategoryIds.includes(category.id)}
                disabled={
                  selectedCategoryIds.length >= 5 && !selectedCategoryIds.includes(category.id)
                }
                onChange={(event) =>
                  setSelectedCategoryIds((current) =>
                    event.target.checked
                      ? [...current, category.id]
                      : current.filter((id) => id !== category.id),
                  )
                }
              />
              {category.name}
            </label>
          ))}
        </div>
        <p className="field-hint">Choose up to five. The first selected category is primary.</p>
      </fieldset>

      <fieldset className="panel">
        <legend>Location and contact</legend>
        <div className="form-row two-columns">
          <label>
            Address
            <input
              name="addressLine1"
              defaultValue={business.address_line_1 ?? ''}
              maxLength={160}
            />
          </label>
          <label>
            Suite / unit
            <input
              name="addressLine2"
              defaultValue={business.address_line_2 ?? ''}
              maxLength={160}
            />
          </label>
          <label>
            City
            <input name="city" defaultValue={business.city ?? ''} maxLength={100} />
          </label>
          <label>
            State
            <select
              name="regionCode"
              value={regionCode}
              onChange={(event) => setRegionCode(event.target.value)}
            >
              <option value="">Select a state</option>
              {usRegionOptions.map(([code, name]) => (
                <option value={code} key={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ZIP code
            <input
              name="postalCode"
              defaultValue={business.postal_code ?? ''}
              inputMode="numeric"
              pattern="\d{5}(-\d{4})?"
              maxLength={10}
            />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" defaultValue={business.phone ?? ''} maxLength={32} />
          </label>
          <label>
            Public email
            <input name="email" type="email" defaultValue={business.email ?? ''} maxLength={254} />
          </label>
          <label>
            Website
            <input
              name="websiteUrl"
              type="url"
              defaultValue={business.website_url ?? ''}
              placeholder="https://"
              maxLength={2048}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="panel">
        <legend>Where you serve</legend>
        <ServiceAreaFields
          defaultType={business.service_area_type}
          defaultRegions={business.service_area_regions}
          defaultRadius={business.service_radius_miles}
          defaultCustomArea={business.service_area}
          selectedRegionCode={regionCode}
        />
      </fieldset>

      <fieldset className="panel">
        <legend>Regular hours</legend>
        <label>
          Business time zone
          <select name="timezone" defaultValue={business.timezone}>
            {eventTimezoneOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="field-hint">Used to calculate whether your business is open now.</span>
        </label>
        <div className="hours-grid">
          {dayNames.map((day, dayIndex) => {
            const hour = hours.find((item) => item.day_of_week === dayIndex);
            const isClosed = closedDays[dayIndex] ?? true;
            return (
              <div className="hours-row" key={day}>
                <strong>{day}</strong>
                <label>
                  Opens
                  <input
                    name={`opens-${dayIndex}`}
                    type="time"
                    defaultValue={timeValue(hour?.opens_at ?? null, '09:00')}
                    disabled={isClosed}
                    required={!isClosed}
                  />
                </label>
                <label>
                  Closes
                  <input
                    name={`closes-${dayIndex}`}
                    type="time"
                    defaultValue={timeValue(hour?.closes_at ?? null, '17:00')}
                    disabled={isClosed}
                    required={!isClosed}
                  />
                </label>
                <label className="closed-toggle">
                  <input
                    name={`closed-${dayIndex}`}
                    type="checkbox"
                    checked={isClosed}
                    onChange={(event) =>
                      setClosedDays((current) => ({
                        ...current,
                        [dayIndex]: event.target.checked,
                      }))
                    }
                  />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="panel">
        <legend>Branding</legend>
        <div className="form-row two-columns">
          <label>
            Primary color
            <input name="primaryColor" type="color" defaultValue={business.primary_color} />
          </label>
          <label>
            Accent color
            <input name="accentColor" type="color" defaultValue={business.accent_color} />
          </label>
          <label>
            Page theme
            <select name="pageTheme" defaultValue={business.page_theme}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Font style
            <select name="fontPair" defaultValue={business.font_pair}>
              <option value="friendly_sans">Friendly sans</option>
              <option value="modern_sans">Modern sans</option>
              <option value="classic_serif">Classic serif</option>
            </select>
          </label>
          <label>
            Button style
            <select name="buttonStyle" defaultValue={business.button_style}>
              <option value="rounded">Rounded</option>
              <option value="soft">Soft corners</option>
              <option value="square">Square corners</option>
            </select>
          </label>
        </div>
        <p className="field-hint">
          These controlled styles keep every page readable and responsive.
        </p>
      </fieldset>

      <div aria-live="polite" className="form-error">
        {state.message ?? errors[0]}
      </div>
      <div className="settings-save-bar">
        <span>Changes update the draft and its private preview.</span>
        <button className="button" disabled={pending}>
          {pending ? 'Saving…' : 'Save business details'}
        </button>
      </div>
    </form>
  );
}

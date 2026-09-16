'use client';

import { useActionState, useState } from 'react';
import { usRegionOptions } from '@sds/validation';

import { type BusinessFormState, createBusinessAction } from './actions';
import { ServiceAreaFields } from '../service-area-fields';

interface Category {
  readonly id: number;
  readonly name: string;
  readonly business_type: string | null;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function BusinessForm({ categories }: { readonly categories: readonly Category[] }) {
  const [state, action, pending] = useActionState<BusinessFormState, FormData>(
    createBusinessAction,
    {},
  );
  const [slug, setSlug] = useState('');
  const [businessType, setBusinessType] = useState('general');
  const [regionCode, setRegionCode] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const errors = state.errors ? Object.values(state.errors).flat() : [];
  const matchingCategories = categories.filter(
    (category) => category.business_type === null || category.business_type === businessType,
  );

  return (
    <form action={action} className="form-stack onboarding-form">
      <fieldset>
        <legend>Business basics</legend>
        <div className="form-row two-columns">
          <label>
            Business name
            <input
              name="name"
              minLength={2}
              maxLength={120}
              required
              onChange={(event) => setSlug(slugify(event.target.value))}
            />
          </label>
          <label>
            Page address
            <span className="input-prefix">
              <span>/b/</span>
              <input
                name="slug"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
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
              setBusinessType(event.target.value);
              setSelectedCategoryIds([]);
            }}
          >
            <option value="food_drink">Food & drink</option>
            <option value="services">Services</option>
            <option value="retail">Retail</option>
            <option value="entertainment_venue">Entertainment or venue</option>
            <option value="general">General</option>
          </select>
        </label>
        <label>
          Description
          <textarea name="description" rows={5} maxLength={2000} />
        </label>
      </fieldset>

      <fieldset>
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

      <fieldset>
        <legend>Location and contact</legend>
        <div className="form-row two-columns">
          <label>
            Address
            <input name="addressLine1" maxLength={160} />
          </label>
          <label>
            Suite / unit
            <input name="addressLine2" maxLength={160} />
          </label>
          <label>
            City
            <input name="city" maxLength={100} />
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
            Postal code
            <input name="postalCode" inputMode="numeric" pattern="\d{5}(-\d{4})?" maxLength={10} />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" maxLength={32} />
          </label>
          <label>
            Public email
            <input name="email" type="email" maxLength={254} />
          </label>
        </div>
        <label>
          Website
          <input name="websiteUrl" type="url" placeholder="https://" maxLength={2048} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Where you serve</legend>
        <ServiceAreaFields selectedRegionCode={regionCode} />
      </fieldset>

      <fieldset>
        <legend>Regular hours</legend>
        <div className="hours-grid">
          {dayNames.map((day, index) => (
            <div className="hours-row" key={day}>
              <strong>{day}</strong>
              <label>
                Opens
                <input name={`opens-${index}`} type="time" defaultValue="09:00" />
              </label>
              <label>
                Closes
                <input name={`closes-${index}`} type="time" defaultValue="17:00" />
              </label>
              <label className="closed-toggle">
                <input name={`closed-${index}`} type="checkbox" defaultChecked={index === 0} />
                Closed
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Starter branding</legend>
        <div className="form-row two-columns">
          <label>
            Primary color
            <input name="primaryColor" type="color" defaultValue="#176B4D" />
          </label>
          <label>
            Accent color
            <input name="accentColor" type="color" defaultValue="#E99B45" />
          </label>
        </div>
      </fieldset>

      <div aria-live="polite" className="form-error">
        {state.message ?? errors[0]}
      </div>
      <button className="button" disabled={pending}>
        {pending ? 'Creating business…' : 'Create draft business'}
      </button>
    </form>
  );
}

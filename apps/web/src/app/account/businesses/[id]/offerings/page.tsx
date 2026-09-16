import { getOfferingTerminology } from '@sds/business-logic';
import type { BusinessType } from '@sds/types';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import {
  archiveOfferingItemAction,
  archiveOfferingSectionAction,
  createOfferingItemAction,
  createOfferingSectionAction,
  moveOfferingItemAction,
  moveOfferingSectionAction,
  restoreOfferingItemAction,
  restoreOfferingSectionAction,
  updateOfferingItemAction,
  updateOfferingSectionAction,
} from './actions';
import { OfferingImageManager } from './offering-image-manager';

interface SectionRow {
  id: string;
  name: string;
  description: string | null;
  is_visible: boolean;
  archived_at: string | null;
}

interface ItemRow {
  id: string;
  section_id: string;
  name: string;
  description: string;
  price_minor: number | null;
  price_text: string | null;
  is_available: boolean;
  is_featured: boolean;
  is_visible: boolean;
  archived_at: string | null;
  media_assets:
    | { alt_text: string | null; storage_path: string }
    | { alt_text: string | null; storage_path: string }[]
    | null;
}

function itemPriceKind(item: ItemRow) {
  if (item.price_text === 'Contact for price') return 'contact';
  if (item.price_text?.startsWith('Starting at $')) return 'starting_at';
  if (item.price_text) return 'custom';
  return 'fixed';
}

export default async function OfferingsPage({
  params,
  searchParams,
}: PageProps<'/account/businesses/[id]/offerings'>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const { data: membership } = await supabase
    .from('business_members')
    .select('businesses(id, name, slug, business_type)')
    .eq('business_id', id)
    .eq('user_id', authData.user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  const joined = membership?.businesses;
  const business = Array.isArray(joined) ? joined[0] : joined;
  if (!business) notFound();

  const terminology = getOfferingTerminology(business.business_type as BusinessType);
  const [{ data: sectionData }, { data: itemData }] = await Promise.all([
    supabase
      .from('offering_sections')
      .select('id, name, description, is_visible, archived_at')
      .eq('business_id', id)
      .order('display_order')
      .order('created_at'),
    supabase
      .from('offering_items')
      .select(
        'id, section_id, name, description, price_minor, price_text, is_available, is_featured, is_visible, archived_at, media_assets(alt_text, storage_path)',
      )
      .eq('business_id', id)
      .order('display_order')
      .order('created_at'),
  ]);
  const sections = (sectionData ?? []) as SectionRow[];
  const items = (itemData ?? []) as ItemRow[];
  const activeSections = sections.filter((section) => !section.archived_at);
  const archivedSections = sections.filter((section) => section.archived_at);
  const archivedItems = items.filter((item) => item.archived_at);

  return (
    <main className="page-shell narrow-shell">
      <nav className="topbar">
        <Link className="brand" href="/account">
          ← Account
        </Link>
        <div className="nav-actions">
          <Link href={`/account/businesses/${id}/media`}>Photos</Link>
          <Link href={`/b/${business.slug}`}>View page</Link>
        </div>
      </nav>

      <div className="page-heading compact-heading">
        <p className="eyebrow">{terminology.items}</p>
        <h1>{business.name}</h1>
        <p>Organize customer-facing {terminology.items.toLowerCase()} into clear sections.</p>
      </div>

      {typeof query.saved === 'string' && <p className="notice-success">{query.saved}</p>}
      {typeof query.error === 'string' && <p className="notice-error">{query.error}</p>}

      <section className="panel offering-create-panel">
        <h2>Add {terminology.section.toLowerCase()}</h2>
        <form action={createOfferingSectionAction} className="inline-create-form">
          <input type="hidden" name="businessId" value={id} />
          <label>
            Name
            <input name="name" maxLength={100} required />
          </label>
          <label>
            Description
            <input name="description" maxLength={500} />
          </label>
          <button className="button">Add section</button>
        </form>
      </section>

      <div className="offering-editor-stack">
        {activeSections.map((section, sectionIndex) => {
          const sectionItems = items.filter(
            (item) => item.section_id === section.id && !item.archived_at,
          );
          return (
            <section className="panel offering-editor" key={section.id}>
              <form action={updateOfferingSectionAction} className="section-edit-form">
                <input type="hidden" name="businessId" value={id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <label>
                  Section name
                  <input name="name" defaultValue={section.name} maxLength={100} required />
                </label>
                <label>
                  Description
                  <input
                    name="description"
                    defaultValue={section.description ?? ''}
                    maxLength={500}
                  />
                </label>
                <label className="inline-check">
                  <input name="isVisible" type="checkbox" defaultChecked={section.is_visible} />
                  Visible
                </label>
                <div className="section-editor-actions">
                  <button className="button button-small">Save section</button>
                  <button
                    className="text-button"
                    formAction={moveOfferingSectionAction}
                    name="direction"
                    value="up"
                    disabled={sectionIndex === 0}
                  >
                    Move up
                  </button>
                  <button
                    className="text-button"
                    formAction={moveOfferingSectionAction}
                    name="direction"
                    value="down"
                    disabled={sectionIndex === activeSections.length - 1}
                  >
                    Move down
                  </button>
                  <button className="text-button" formAction={archiveOfferingSectionAction}>
                    Archive
                  </button>
                </div>
              </form>

              <div className="offering-item-list">
                {sectionItems.map((item, index) => (
                  <details className="offering-item-editor" key={item.id}>
                    <summary>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.is_available ? 'Available' : 'Sold out / unavailable'}</small>
                      </span>
                      <span>
                        {item.price_text ??
                          (item.price_minor === null
                            ? ''
                            : `$${(item.price_minor / 100).toFixed(2)}`)}
                      </span>
                    </summary>
                    <form action={updateOfferingItemAction} className="form-stack compact-form">
                      <input type="hidden" name="businessId" value={id} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <label>
                        Name
                        <input name="name" defaultValue={item.name} maxLength={120} required />
                      </label>
                      <OfferingImageManager
                        businessId={id}
                        businessName={business.name}
                        itemId={item.id}
                        itemName={item.name}
                        userId={authData.user.id}
                        currentImage={(() => {
                          const asset = Array.isArray(item.media_assets)
                            ? item.media_assets[0]
                            : item.media_assets;
                          if (!asset) return null;
                          return {
                            altText: asset.alt_text,
                            url: supabase.storage
                              .from('business-media')
                              .getPublicUrl(asset.storage_path).data.publicUrl,
                          };
                        })()}
                      />
                      <label>
                        Description
                        <textarea
                          name="description"
                          defaultValue={item.description}
                          maxLength={1000}
                          rows={3}
                        />
                      </label>
                      <div className="form-row">
                        <label>
                          Price type
                          <select name="priceKind" defaultValue={itemPriceKind(item)}>
                            <option value="fixed">Fixed price</option>
                            <option value="starting_at">Starting at</option>
                            <option value="contact">Contact for price</option>
                            <option value="custom">Custom text</option>
                          </select>
                        </label>
                        <label>
                          Amount (USD)
                          <input
                            name="price"
                            inputMode="decimal"
                            defaultValue={
                              item.price_minor === null ? '' : (item.price_minor / 100).toFixed(2)
                            }
                            placeholder="4.50"
                          />
                        </label>
                        <label>
                          Custom text
                          <input
                            name="priceText"
                            defaultValue={item.price_text ?? ''}
                            maxLength={80}
                            placeholder="Starting at $50"
                          />
                        </label>
                      </div>
                      <div className="item-checks">
                        <label>
                          <input
                            name="isAvailable"
                            type="checkbox"
                            defaultChecked={item.is_available}
                          />
                          Available
                        </label>
                        <label>
                          <input
                            name="isFeatured"
                            type="checkbox"
                            defaultChecked={item.is_featured}
                          />
                          Featured
                        </label>
                        <label>
                          <input
                            name="isVisible"
                            type="checkbox"
                            defaultChecked={item.is_visible}
                          />
                          Visible
                        </label>
                      </div>
                      <div className="item-editor-actions">
                        <button className="button button-small">Save item</button>
                        <button
                          className="text-button"
                          formAction={moveOfferingItemAction}
                          name="direction"
                          value="up"
                          disabled={index === 0}
                        >
                          Move up
                        </button>
                        <button
                          className="text-button"
                          formAction={moveOfferingItemAction}
                          name="direction"
                          value="down"
                          disabled={index === sectionItems.length - 1}
                        >
                          Move down
                        </button>
                        <button className="text-button" formAction={archiveOfferingItemAction}>
                          Archive item
                        </button>
                      </div>
                    </form>
                  </details>
                ))}
              </div>

              <details className="add-item-panel">
                <summary>Add {terminology.item.toLowerCase()}</summary>
                <form action={createOfferingItemAction} className="form-stack compact-form">
                  <input type="hidden" name="businessId" value={id} />
                  <input type="hidden" name="sectionId" value={section.id} />
                  <label>
                    Name
                    <input name="name" maxLength={120} required />
                  </label>
                  <label>
                    Description
                    <textarea name="description" maxLength={1000} rows={3} />
                  </label>
                  <div className="form-row">
                    <label>
                      Price type
                      <select name="priceKind" defaultValue="fixed">
                        <option value="fixed">Fixed price</option>
                        <option value="starting_at">Starting at</option>
                        <option value="contact">Contact for price</option>
                        <option value="custom">Custom text</option>
                      </select>
                    </label>
                    <label>
                      Amount (USD)
                      <input name="price" inputMode="decimal" placeholder="4.50" />
                    </label>
                    <label>
                      Custom text
                      <input name="priceText" maxLength={80} placeholder="Contact for price" />
                    </label>
                  </div>
                  <div className="item-checks">
                    <label>
                      <input name="isAvailable" type="checkbox" defaultChecked /> Available
                    </label>
                    <label>
                      <input name="isFeatured" type="checkbox" /> Featured
                    </label>
                  </div>
                  <button className="button button-small">
                    Add {terminology.item.toLowerCase()}
                  </button>
                </form>
              </details>
            </section>
          );
        })}
        {!activeSections.length && (
          <div className="empty-state">
            <strong>No sections yet</strong>
            <span>Add the first {terminology.section.toLowerCase()} above.</span>
          </div>
        )}
      </div>

      {(archivedSections.length > 0 || archivedItems.length > 0) && (
        <details className="panel archived-offerings">
          <summary>Archived offerings ({archivedSections.length + archivedItems.length})</summary>
          <div>
            {archivedSections.map((section) => (
              <form action={restoreOfferingSectionAction} key={section.id}>
                <input type="hidden" name="businessId" value={id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <span>Section: {section.name}</span>
                <button className="text-button">Restore</button>
              </form>
            ))}
            {archivedItems.map((item) => (
              <form action={restoreOfferingItemAction} key={item.id}>
                <input type="hidden" name="businessId" value={id} />
                <input type="hidden" name="itemId" value={item.id} />
                <span>Item: {item.name}</span>
                <button className="text-button">Restore</button>
              </form>
            ))}
          </div>
        </details>
      )}
    </main>
  );
}

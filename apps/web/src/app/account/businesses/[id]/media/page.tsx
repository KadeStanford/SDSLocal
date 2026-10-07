import { SurfacePanel } from '@/components/shared-ui';
import { BusinessWorkspaceHeader } from '@/components/business-workspace-header';

import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { type ExistingBusinessPhoto, MediaManager } from './media-manager';

interface PhotoRow {
  id: string;
  role: ExistingBusinessPhoto['role'];
  media_assets:
    | { alt_text: string | null; storage_path: string }
    | { alt_text: string | null; storage_path: string }[]
    | null;
}

export default async function BusinessMediaPage({
  params,
}: PageProps<'/account/businesses/[id]/media'>) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const { data: membership } = await supabase
    .from('business_members')
    .select('role, businesses(id, name, slug)')
    .eq('business_id', id)
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .eq('role', 'owner')
    .maybeSingle();
  const joinedBusiness = membership?.businesses;
  const business = Array.isArray(joinedBusiness) ? joinedBusiness[0] : joinedBusiness;
  if (!business) notFound();

  const { data: photoData } = await supabase
    .from('business_photos')
    .select('id, role, media_assets(alt_text, storage_path)')
    .eq('business_id', id)
    .order('role')
    .order('display_order');
  const photos = ((photoData ?? []) as PhotoRow[]).flatMap((row) => {
    const asset = Array.isArray(row.media_assets) ? row.media_assets[0] : row.media_assets;
    if (!asset) return [];
    const { data } = supabase.storage.from('business-media').getPublicUrl(asset.storage_path);
    return [{ altText: asset.alt_text, id: row.id, role: row.role, url: data.publicUrl }];
  });

  return (
    <main className="page-shell business-workspace">
      <BusinessWorkspaceHeader
        id={id}
        name={business.name}
        slug={business.slug}
        section="media"
        title="Photos & identity"
        description="Manage the logo, cover and gallery customers see on your page."
      />
      <SurfacePanel>
        <MediaManager
          businessId={business.id}
          businessName={business.name}
          initialPhotos={photos}
          userId={authData.user.id}
        />
      </SurfacePanel>
    </main>
  );
}

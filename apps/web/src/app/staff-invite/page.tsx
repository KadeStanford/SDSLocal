import { redirect } from 'next/navigation';

export default async function StaffInviteAlias({ searchParams }: PageProps<'/staff-invite'>) {
  const query = await searchParams;
  const token = typeof query.token === 'string' ? query.token : '';
  const suffix = token ? `?token=${encodeURIComponent(token)}` : '';
  redirect(`/invite/staff${suffix}`);
}

import { PageHeader } from '@/components/page-header';

export function AccountBrandHeader({
  onBack,
  disabled = false,
  label = 'Back to account',
}: {
  onBack?: (() => void) | undefined;
  disabled?: boolean;
  label?: string;
}) {
  return <PageHeader onBack={onBack} backLabel={label} backDisabled={disabled} />;
}

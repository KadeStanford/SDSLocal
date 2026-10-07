import { AppIcon } from '@/components/app-icon';
import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { MerchantButton } from './merchant-ui';

type Category = { id: number; name: string; business_type: string | null };
export function BusinessCategoryEditor({
  businessId,
  businessType,
  disabled,
  onSaved,
  onDirtyChange,
}: {
  businessId: string;
  businessType: string;
  disabled: boolean;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const c = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [original, setOriginal] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const scope = businessId + ':' + attempt;
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setReady(false);
    setError('');
  }
  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase
        .from('categories')
        .select('id, name, business_type')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('business_categories')
        .select('category_id, is_primary')
        .eq('business_id', businessId)
        .order('is_primary', { ascending: false })
        .order('category_id'),
    ])
      .then(([options, saved]) => {
        if (!active) return;
        if (options.error || saved.error) {
          setError('Categories couldn’t load. Retry to edit them.');
          return;
        }
        setCategories(options.data ?? []);
        const ids = (saved.data ?? []).map((row) => row.category_id);
        setSelected(ids);
        setOriginal(ids);
        setReady(true);
      })
      .catch(() => {
        if (active) setError('Categories couldn’t load. Retry to edit them.');
      });
    return () => {
      active = false;
    };
  }, [businessId, attempt]);
  const dirty = JSON.stringify(selected) !== JSON.stringify(original);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  async function save() {
    setSaving(true);
    setError('');
    const { error } = await supabase.rpc('set_business_categories', {
      p_business_id: businessId,
      p_category_ids: selected,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOriginal(selected);
    onSaved();
  }
  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 18, backgroundColor: c.backgroundElement }}>
      <ThemedText type="smallBold">Business categories</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Choose up to five. Your first choice is primary. At least one is needed to publish.
      </ThemedText>
      {error ? (
        <>
          <ThemedText>{error}</ThemedText>
          {!ready && (
            <MerchantButton
              label="Retry categories"
              secondary
              onPress={() => setAttempt((n) => n + 1)}
            />
          )}
        </>
      ) : null}
      {!ready && !error && <ThemedText>Loading categories…</ThemedText>}
      {ready &&
        categories
          .filter(
            (row) =>
              !row.business_type || row.business_type === businessType || selected.includes(row.id),
          )
          .map((row) => {
            const chosen = selected.includes(row.id);
            return (
              <Pressable
                key={row.id}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: chosen,
                  disabled: disabled || saving || (!chosen && selected.length >= 5),
                }}
                disabled={disabled || saving || (!chosen && selected.length >= 5)}
                onPress={() =>
                  setSelected((ids) =>
                    chosen ? ids.filter((id) => id !== row.id) : [...ids, row.id],
                  )
                }
                style={{
                  padding: 12,
                  minHeight: 48,
                  borderRadius: 12,
                  backgroundColor: chosen ? c.backgroundSelected : c.background,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><AppIcon name={chosen ? 'circle-check' : 'circle'} size={18} tintColor={c.text} /><ThemedText style={{ flex: 1 }}>{row.name}{selected[0] === row.id ? ' · Primary' : ''}</ThemedText></View>
              </Pressable>
            );
          })}
      {ready && (
        <MerchantButton
          label={saving ? 'Saving categories…' : dirty ? 'Save categories' : 'Categories saved'}
          disabled={disabled || saving || !dirty}
          onPress={() => void save()}
        />
      )}
    </View>
  );
}

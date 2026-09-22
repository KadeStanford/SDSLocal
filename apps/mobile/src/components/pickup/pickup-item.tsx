import { useState } from 'react';
import { Modal, ScrollView, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { editableModifiers, itemIssue, unitEstimate } from '@/lib/pickup-order-flow';
import { modifierGroupIssue, toggleModifier } from '@/lib/pickup-menu-controls';
import { money, type CartLine, type Product } from '@/lib/square-commerce-core';
import { QuantityStepper } from './quantity-stepper';
import { ProductPhoto } from './product-photo';

export function PickupItem({
  product,
  variants,
  line,
  disabled = false,
  onClose,
  onSave,
}: {
  product: Product;
  variants?: Product[];
  line?: CartLine | undefined;
  disabled?: boolean;
  onClose: () => void;
  onSave: (product: Product, ids: string[], quantity: number) => string | null | void;
}) {
  const c = useTheme();
  const reducedMotion = useReducedMotion();
  const options = variants?.length ? variants : [product];
  const [selectedId, setSelectedId] = useState(line?.variationId ?? product.id);
  const selectedProduct = options.find((option) => option.id === selectedId) ?? product;
  const [storedIds, setIds] = useState(line?.modifierIds ?? []);
  const ids = editableModifiers(selectedProduct, storedIds);
  const [quantity, setQuantity] = useState(line?.quantity ?? 1);
  const [saveError, setSaveError] = useState('');
  const issue = itemIssue(selectedProduct, ids, quantity);
  return (
    <Modal
      visible
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <ThemedText type="smallBold">{line ? 'Edit your item' : 'Item details'}</ThemedText>
          <AppButton
            label="✕"
            accessibilityLabel="Close item details"
            variant="tertiary"
            onPress={onClose}
            style={{ minWidth: 48 }}
          />
        </View>
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ padding: 16, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <ProductPhoto image={selectedProduct.image} detail />
          <View style={{ gap: 8 }}>
            <ThemedText type="subtitle">{selectedProduct.name}</ThemedText>
            <ThemedText type="smallBold">
              {selectedProduct.variation && selectedProduct.variation !== 'Regular'
                ? `${selectedProduct.variation} · `
                : ''}
              {money(selectedProduct.price, selectedProduct.currency)}
            </ThemedText>
            {!!selectedProduct.description && (
              <ThemedText themeColor="textSecondary">{selectedProduct.description}</ThemedText>
            )}
          </View>
          {options.length > 1 && (
            <View style={{ gap: 10 }}>
              <ThemedText type="card">Choose a variation</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Select the size or option you want.
              </ThemedText>
              {options.map((option) => {
                const selected = option.id === selectedProduct.id;
                const unavailable = option.available === false;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: disabled || unavailable }}
                    accessibilityLabel={`${option.variation || 'Regular'} · ${money(option.price, option.currency)}${unavailable ? ', unavailable' : ''}`}
                    disabled={disabled || unavailable}
                    onPress={() => {
                      setSelectedId(option.id);
                      setIds([]);
                      setSaveError('');
                    }}
                    style={{
                      minHeight: 58,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: selected ? c.accent : c.divider,
                      backgroundColor: selected ? c.backgroundElement : c.background,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View
                      accessible={false}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? c.accent : c.inputBorder,
                        backgroundColor: selected ? c.accent : c.background,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ThemedText type="smallBold" style={{ color: c.onAccent }}>
                        {selected ? '●' : ''}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={{ flex: 1 }}
                      themeColor={unavailable ? 'textSecondary' : 'text'}
                    >
                      {option.variation || 'Regular'}
                    </ThemedText>
                    <ThemedText
                      type="smallBold"
                      themeColor={unavailable ? 'textSecondary' : 'text'}
                    >
                      {money(option.price, option.currency)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          )}
          {selectedProduct.groups
            .filter((g) => g.max > 0 || g.min > 0)
            .map((group) => {
              const groupIssue = modifierGroupIssue(group, ids);
              const selectedCount = group.modifiers.filter((m) => ids.includes(m.id)).length;
              const radio = group.min > 0 && group.max === 1;
              return (
                <View key={group.id} style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <ThemedText type="card">{group.name}</ThemedText>
                    <ThemedText
                      type="smallBold"
                      style={{ color: group.min ? c.warningText : c.textSecondary }}
                    >
                      {group.min ? 'Required' : 'Optional'}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {group.max === 1
                      ? 'Choose one'
                      : group.min === group.max
                        ? `Choose ${group.min}`
                        : group.min
                          ? `Choose ${group.min}–${group.max}`
                          : `Choose up to ${group.max}`}
                  </ThemedText>
                  {group.modifiers.map((option) => {
                    const checked = ids.includes(option.id);
                    const atLimit = !checked && group.max > 1 && selectedCount >= group.max;
                    return (
                      <Pressable
                        key={option.id}
                        accessibilityRole={radio ? 'radio' : 'checkbox'}
                        accessibilityState={{ checked, disabled: disabled || atLimit }}
                        accessibilityLabel={`${option.name}${option.price ? `, add ${money(option.price, selectedProduct.currency)}` : ', included'}${atLimit ? ', maximum selected' : ''}`}
                        disabled={disabled || atLimit}
                        onPress={() => {
                          setIds(toggleModifier(group, ids, option.id));
                          setSaveError('');
                        }}
                        style={{
                          minHeight: 56,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: c.divider,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <View
                          accessible={false}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: radio ? 12 : 6,
                            borderWidth: 2,
                            borderColor: checked ? c.accent : c.inputBorder,
                            backgroundColor: checked ? c.accent : c.background,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ThemedText type="smallBold" style={{ color: c.onAccent }}>
                            {checked ? (radio ? '●' : '✓') : ''}
                          </ThemedText>
                        </View>
                        <ThemedText
                          style={{ flex: 1, minWidth: 0 }}
                          themeColor={atLimit ? 'textSecondary' : 'text'}
                        >
                          {option.name}
                        </ThemedText>
                        {option.price !== 0 && (
                          <ThemedText
                            type="small"
                            style={{ maxWidth: '34%' }}
                            themeColor="textSecondary"
                          >
                            +{money(option.price, selectedProduct.currency)}
                          </ThemedText>
                        )}
                      </Pressable>
                    );
                  })}
                  {groupIssue && (
                    <ThemedText
                      type="small"
                      style={{ color: c.warningText }}
                      accessibilityLiveRegion="polite"
                    >
                      {groupIssue}
                    </ThemedText>
                  )}
                </View>
              );
            })}
        </ScrollView>
        <View
          style={{
            padding: 16,
            gap: 12,
            flexShrink: 0,
            borderTopWidth: 1,
            borderTopColor: c.divider,
            backgroundColor: c.background,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <View>
              <ThemedText type="smallBold">Quantity</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Estimate before tax
              </ThemedText>
            </View>
            <QuantityStepper
              name={selectedProduct.name}
              quantity={quantity}
              minimum={1}
              disabled={disabled}
              onChange={(delta) => setQuantity((q) => q + delta)}
            />
          </View>
          {(disabled || selectedProduct.available === false || saveError) && (
            <ThemedText
              type="small"
              accessibilityLiveRegion="polite"
              style={{ color: c.warningText }}
            >
              {saveError ||
                (selectedProduct.available === false
                  ? 'This item is currently unavailable.'
                  : 'Ordering changed. Close this item and refresh pickup options.')}
            </ThemedText>
          )}
          <AppButton
            label={`${line ? 'Update item' : 'Add to cart'} · ${money(unitEstimate(selectedProduct, ids) * quantity, selectedProduct.currency)}`}
            disabled={disabled || !!issue}
            onPress={() => setSaveError(onSave(selectedProduct, ids, quantity) || '')}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

import { RequestQuestions } from './request-question-fields';
import { Brand } from '@/constants/theme';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import * as Crypto from 'expo-crypto';
import { ChoicePicker } from './choice-picker';
import { FormField } from './form-field';
import {
  MerchantButton,
  MerchantRow,
  MerchantSheet,
  MerchantStatus,
  merchantStyles,
} from './merchant-ui';
import { ThemedText } from './themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import {
  fieldTypeLabels,
  type RequestField,
  type RequestFieldType,
} from '@/lib/service-request-schema';

export function RequestFormBuilder({
  fields,
  onChange,
  disabled = false,
}: {
  fields: RequestField[];
  onChange: (next: RequestField[]) => void;
  disabled?: boolean;
}) {
  const c = useMerchantTheme(),
    [selected, setSelected] = useState<string | null>(null),
    [preview, setPreview] = useState(false),
    [answers, setAnswers] = useState<Record<string, string>>({});
  const field = fields.find((f) => f.id === selected);
  const patch = (change: Partial<RequestField>) =>
    onChange(fields.map((f) => (f.id === selected ? { ...f, ...change } : f)));
  const move = (delta: number) => {
    const next = [...fields],
      i = next.findIndex((f) => f.id === selected),
      j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          padding: 18,
          gap: 8,
          borderRadius: 14,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <ThemedText type="card">Ask the right questions</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Build the details you need for an estimate or service request. Customers also provide a
          description, preferred timing, and their account contact.
        </ThemedText>
        <MerchantStatus label={`${fields.length} of 15 questions`} tone="quiet" />
      </View>
      <View style={{ gap: 10 }}>
        {fields.map((f, i) => (
          <View
            key={f.id}
            style={{
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: c.surface,
            }}
          >
            <MerchantRow
              title={`${i + 1}. ${f.label || 'Untitled question'}`}
              subtitle={fieldTypeLabels[f.type] + (f.required ? ' · Required' : ' · Optional')}
              onPress={() => setSelected(f.id)}
              disabled={disabled}
            />
          </View>
        ))}
      </View>
      <MerchantButton
        brand
        label="Add question"
        secondary
        disabled={disabled || fields.length >= 15}
        onPress={() => {
          const id = Crypto.randomUUID();
          onChange([...fields, { id, label: '', type: 'text', required: false, options: [] }]);
          setSelected(id);
        }}
      />
      <MerchantButton
        brand
        label="Preview customer form"
        secondary
        disabled={disabled}
        onPress={() => {
          setAnswers({});
          setPreview(true);
        }}
      />
      <MerchantSheet
        visible={!!field}
        title="Edit question"
        blocked={disabled}
        onClose={() => setSelected(null)}
        footer={
          <MerchantButton
            brand
            label="Done"
            disabled={disabled}
            onPress={() => setSelected(null)}
          />
        }
      >
        {field && (
          <View style={{ gap: 20 }}>
            <FormField label="Question">
              <TextInput
                accessibilityLabel="Question"
                editable={!disabled}
                value={field.label}
                maxLength={120}
                onChangeText={(label) => patch({ label })}
                placeholder="For example, what is the property size?"
                placeholderTextColor={c.secondary}
                style={[
                  merchantStyles.input,
                  { color: c.text, backgroundColor: c.background, borderColor: c.border },
                ]}
              />
            </FormField>
            <ChoicePicker
              label="Answer type"
              value={field.type}
              disabled={disabled}
              options={Object.entries(fieldTypeLabels).map(([value, label]) => ({
                value: value as RequestFieldType,
                label,
              }))}
              onChange={(type) =>
                patch({ type, options: type === 'choice' ? ['Option 1', 'Option 2'] : [] })
              }
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="smallBold">Required answer</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Customers must answer before sending.
                </ThemedText>
              </View>
              <Switch
                trackColor={{ false: c.border, true: Brand.primary }}
                accessibilityLabel="Required answer"
                value={field.required}
                disabled={disabled}
                onValueChange={(required) => patch({ required })}
              />
            </View>
            {field.type === 'choice' && (
              <FormField label="Choices · one per line">
                <TextInput
                  accessibilityLabel="Choice options"
                  multiline
                  editable={!disabled}
                  value={field.options.join('\n')}
                  onChangeText={(text) => patch({ options: text.split('\n') })}
                  style={[
                    merchantStyles.input,
                    {
                      minHeight: 140,
                      color: c.text,
                      backgroundColor: c.background,
                      borderColor: c.border,
                      textAlignVertical: 'top',
                    },
                  ]}
                />
              </FormField>
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <MerchantButton
                  brand
                  label="Move up"
                  secondary
                  disabled={disabled || fields[0]?.id === selected}
                  onPress={() => move(-1)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <MerchantButton
                  brand
                  label="Move down"
                  secondary
                  disabled={disabled || fields[fields.length - 1]?.id === selected}
                  onPress={() => move(1)}
                />
              </View>
            </View>
            <MerchantButton
              brand
              label="Remove question"
              destructive
              disabled={disabled}
              onPress={() => {
                onChange(fields.filter((f) => f.id !== selected));
                setSelected(null);
              }}
            />
          </View>
        )}
      </MerchantSheet>
      <MerchantSheet
        visible={preview}
        title="Customer form preview"
        onClose={() => setPreview(false)}
        footer={<MerchantButton brand label="Done" onPress={() => setPreview(false)} />}
      >
        <ThemedText type="small" themeColor="textSecondary">
          Preview only · answers entered here are not submitted.
        </ThemedText>
        {fields.length ? (
          <RequestQuestions fields={fields} answers={answers} onChange={setAnswers} />
        ) : (
          <ThemedText>
            There are no extra questions. Customers can still describe their request.
          </ThemedText>
        )}
      </MerchantSheet>
    </View>
  );
}

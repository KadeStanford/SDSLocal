import { View } from 'react-native';
import { ChoicePicker } from './choice-picker';
import { DateField } from './date-field';
import { ThemedText } from './themed-text';
import { RequestChoiceTiles, RequestFieldLabel, RequestInput } from './request-form-ui';
import type { RequestField, RequestAnswer } from '@/lib/service-request-schema';
import { inputPresets } from '@/lib/input-presets';
export function RequestQuestions({
  fields,
  answers,
  onChange,
  disabled = false,
}: {
  fields: readonly RequestField[];
  answers: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 24 }}>
      {fields.map((f) => {
        const options = f.type === 'yes_no' ? ['Yes', 'No'] : f.options;
        const choice = f.type === 'choice' || f.type === 'yes_no';
        if (choice && options.length > 4)
          return (
            <ChoicePicker
              key={f.id}
              businessStyle
              label={f.label + (f.required ? ' · Required' : ' · Optional')}
              value={answers[f.id] || null}
              options={options.map((value) => ({ value, label: value }))}
              disabled={disabled}
              onChange={(value) => onChange({ ...answers, [f.id]: value })}
            />
          );
        return (
          <RequestFieldLabel key={f.id} label={f.label} required={f.required}>
            {choice ? (
              <RequestChoiceTiles
                label={f.label}
                options={options}
                value={answers[f.id]}
                disabled={disabled}
                onChange={(value) => onChange({ ...answers, [f.id]: value })}
              />
            ) : f.type === 'date' ? (
              <DateField
                label={f.label}
                value={answers[f.id] ?? ''}
                required={f.required}
                disabled={disabled}
                onChange={(value) => onChange({ ...answers, [f.id]: value })}
              />
            ) : (
              <RequestInput
                accessibilityLabel={f.label + (f.required ? ', required' : '')}
                editable={!disabled}
                value={answers[f.id] ?? ''}
                onChangeText={(value) => onChange({ ...answers, [f.id]: value })}
                keyboardType={f.type === 'number' ? 'numbers-and-punctuation' : 'default'}
                {...(f.type === 'email'
                  ? inputPresets.email
                  : f.type === 'phone'
                    ? inputPresets.phone
                    : f.type === 'url'
                      ? inputPresets.url
                      : {})}
                placeholder={
                  f.type === 'long_text'
                    ? 'Add a few details…'
                    : f.type === 'email'
                      ? 'name@example.com'
                      : f.type === 'phone'
                        ? 'Phone number'
                        : f.type === 'url'
                          ? 'https://example.com'
                          : 'Your answer'
                }
                multiline={f.type === 'long_text'}
                maxLength={f.type === 'long_text' ? 2000 : 300}
                style={f.type === 'long_text' ? { minHeight: 100 } : undefined}
              />
            )}
          </RequestFieldLabel>
        );
      })}
    </View>
  );
}
export function RequestAnswers({ answers }: { answers: readonly RequestAnswer[] }) {
  return (
    <View style={{ gap: 18 }}>
      {answers.map((a) => (
        <View key={a.id} style={{ gap: 5 }}>
          <ThemedText type="small" themeColor="textSecondary">
            {a.label}
          </ThemedText>
          <ThemedText selectable>{a.value}</ThemedText>
        </View>
      ))}
    </View>
  );
}

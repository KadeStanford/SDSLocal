import type { TextInputProps } from 'react-native';

// Explicit semantic hints: never infer the meaning of a custom field from its label.
export const inputPresets = {
  name: {
    autoComplete: 'name',
    textContentType: 'name',
    autoCapitalize: 'words',
    autoCorrect: false,
  },
  email: {
    keyboardType: 'email-address',
    autoComplete: 'email',
    textContentType: 'emailAddress',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  phone: {
    keyboardType: 'phone-pad',
    autoComplete: 'tel',
    textContentType: 'telephoneNumber',
    autoCorrect: false,
  },
  url: {
    keyboardType: 'url',
    autoComplete: 'url',
    textContentType: 'URL',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  street: {
    autoComplete: 'street-address',
    textContentType: 'streetAddressLine1',
    autoCapitalize: 'words',
  },
  city: {
    autoComplete: 'postal-address-locality',
    textContentType: 'addressCity',
    autoCapitalize: 'words',
  },
  postal: {
    autoComplete: 'postal-code',
    textContentType: 'postalCode',
    keyboardType: 'numbers-and-punctuation',
    autoCorrect: false,
  },
  search: { returnKeyType: 'search', autoCapitalize: 'none', autoCorrect: false },
} as const satisfies Record<string, TextInputProps>;

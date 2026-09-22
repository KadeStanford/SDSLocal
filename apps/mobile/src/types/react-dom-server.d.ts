/** The mobile workspace already includes react-dom; only this test renderer API is used. */
declare module 'react-dom/server' {
  export function renderToStaticMarkup(node: import('react').ReactNode): string;
}

declare module 'react-native-web' {
  export const View: typeof import('react-native').View;
  export const AppRegistry: {
    registerComponent(name: string, provider: () => import('react').ComponentType): void;
    getApplication(
      name: string,
      props: object,
    ): {
      element: import('react').ReactNode;
      getStyleElement(): import('react').ReactNode;
    };
  };
}

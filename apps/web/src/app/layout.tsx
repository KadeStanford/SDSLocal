import type { Metadata } from 'next';

import { AuthHashHandler } from '@/app/auth/auth-hash-handler';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SDS Local',
    template: '%s · SDS Local',
  },
  description: 'Discover local businesses, see what is happening, and keep local rewards together.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}

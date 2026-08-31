import type { Metadata, Viewport } from 'next';
import { Archivo, Anybody, Martian_Mono } from 'next/font/google';

import './globals.css';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
});

const anybody = Anybody({
  variable: '--font-anybody',
  subsets: ['latin'],
});

const martianMono = Martian_Mono({
  variable: '--font-martian-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SL Maps',
  description: 'Interactive maps built with Mapbox and Next.js',
};

// viewportFit: 'cover' is required for env(safe-area-inset-*) to resolve to
// anything other than 0 on notched devices — without it, every safe-area
// padding added elsewhere in the app (headers, floating map controls,
// bottom sheets) is a no-op. themeColor matches --ground-0's dark value
// (data-theme="dark" is hardcoded below; the light theme is currently dead
// code, so a single static value is fine here).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0c0b09',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${archivo.variable} ${anybody.variable} ${martianMono.variable} h-full antialiased`}
    >
      <body className="h-dvh flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}

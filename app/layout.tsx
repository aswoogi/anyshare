import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnyShare - Personal Capture & Archive',
  description: 'Minimalist all-in-one capture & archive webapp',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AnyShare',
  },
};

export const viewport: Viewport = {
  themeColor: '#f8f9fa',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-blue-100 dark:selection:bg-blue-900/40">
        {children}
      </body>
    </html>
  );
}

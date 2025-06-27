import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import type { Metadata, Viewport } from 'next';
import { IOSPWAHandler } from "@/components/ios-pwa-handler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'LeadFlow',
  description: 'Your LeadFlow application',
  applicationName: 'LeadFlow',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LeadFlow',
  },
  icons: {
    icon: [
      { url: '/app-icon.svg', type: 'image/svg+xml' },
      { url: '/app-icon.svg', sizes: '32x32', type: 'image/svg+xml' },
      { url: '/app-icon.svg', sizes: '16x16', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/apple-touch-icon.png', sizes: '180x180' },
      { url: '/apple-touch-icon.png', sizes: '152x152' },
      { url: '/apple-touch-icon.png', sizes: '120x120' },
      { url: '/apple-touch-icon.png', sizes: '76x76' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileImage': '/app-icon.svg',
    'msapplication-TileColor': '#2DD4BF',
    'msapplication-config': '/browserconfig.xml',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2DD4BF' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1419' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} font-body antialiased bg-background text-foreground min-h-screen`}>
        <Providers>
          <IOSPWAHandler />
          {children}
        </Providers>
      </body>
    </html>
  );
}
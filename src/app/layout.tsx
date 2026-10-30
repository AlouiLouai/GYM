import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
import { DocumentLang } from "@/components/document-lang";
import { DOCUMENT_LANG_SCRIPT } from "@/lib/document-lang-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist has no Arabic glyphs; the browser falls back to this one per character.
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  applicationName: "Gym Coach",
  title: { default: "Gym Coach", template: "%s · Gym Coach" },
  description:
    "AI gym coach: counts your reps, checks your form and tracks your PRs with your camera, entirely on-device. English, العربية, تونسي.",
  appleWebApp: {
    capable: true,
    title: "Gym Coach",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script may switch lang/dir before hydration, hence suppressHydrationWarning.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: DOCUMENT_LANG_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <DocumentLang />
        <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  );
}

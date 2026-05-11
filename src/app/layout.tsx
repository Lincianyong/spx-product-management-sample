import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Geist isn't bundled in Next 14's font module; Inter is the closest editorial-neutral sans.
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cadence.spx-express.com"),
  title: {
    default: "Cadence — SPX Express AI Engineering",
    template: "%s · Cadence",
  },
  description:
    "Editorial product management for SPX Express AI Engineering. Three altitudes — Epic, Project, Ticket. Three planning stages — Picklist, Estimation, Joint Commit. AI as evidence, never author.",
  applicationName: "Cadence",
  authors: [{ name: "SPX Express · AI Engineering" }],
  generator: "Next.js",
  keywords: [
    "Cadence",
    "SPX Express",
    "product management",
    "sprint planning",
    "AI engineering",
    "Epic",
    "Project",
    "Ticket",
  ],
  category: "Productivity",
  referrer: "origin-when-cross-origin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Cadence — SPX Express AI Engineering",
    description: "Plan with conviction. Ship in cadence.",
    url: "https://cadence.spx-express.com",
    siteName: "Cadence",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Cadence — SPX Express AI Engineering",
    description: "Plan with conviction. Ship in cadence.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
    shortcut: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Cadence",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F2EB" },
    { media: "(prefers-color-scheme: dark)", color: "#F6F2EB" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}

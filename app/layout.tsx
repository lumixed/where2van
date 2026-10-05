import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
});

// Pixelify's "5" is almost identical to its "S", which makes dates and
// addresses hard to read. This font is used for the ten digits only, scaled
// up to match Pixelify's height.
const digits = localFont({
  src: "../node_modules/@fontsource/vt323/files/vt323-latin-400-normal.woff2",
  variable: "--font-digits",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+30-39" },
    { prop: "size-adjust", value: "128%" },
  ],
});

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Where2Van",
  description: "Our Vancouver map: places we want to go and places we've been.",
  // A private map for two people; keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#b5e08a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixelify.variable} ${digits.variable} ${pressStart.variable} h-full`}>
      <body className="h-full font-sans">{children}</body>
    </html>
  );
}

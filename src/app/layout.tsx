import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: {
    default: "RBH Assets — CK Birla Hospitals",
    template: "%s · RBH Assets",
  },
  description:
    "Map, track, and manage assets at Rukmani Birla Hospital (CK Birla Hospitals).",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "RBH Assets",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1f2a44",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <PWARegister />
      </body>
    </html>
  );
}

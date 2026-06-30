import type { Metadata, Viewport } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import { PwaRegistry } from "@/components/PwaRegistry";

const fontSerif = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CollaboWrite",
  description: "A collaborative storytelling platform.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2d3436",
};

import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontSerif.variable} ${fontSans.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <PwaRegistry />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

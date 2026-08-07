import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Archivo, Anybody, Martian_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SL Maps",
  description: "Interactive maps built with Mapbox and Next.js",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme="dark"
        className={`${archivo.variable} ${anybody.variable} ${martianMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}

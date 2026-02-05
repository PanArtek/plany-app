import type { Metadata } from "next";
import { fontMono, fontSans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLANY",
  description: "Kosztorysowanie fit-out",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark">
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

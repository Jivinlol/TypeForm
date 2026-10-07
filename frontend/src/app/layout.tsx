
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

// Inter closely resembles the clean typography Typeform uses
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Typeform Clone",
  description: "A one-question-at-a-time conversational form builder.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F3F4F6] text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
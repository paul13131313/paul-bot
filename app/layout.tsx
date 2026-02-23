import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://paul-bot-xi.vercel.app"
  ),
  title: "PAUL bot",
  description: "永野広志（Paul）のAIチャットボット。仕事、旅、好きなものについてなんでもきいてね。",
  icons: {
    icon: "/icon.jpg",
    apple: "/icon.jpg",
  },
  openGraph: {
    title: "PAUL bot",
    description: "永野広志（Paul）のAIチャットボット。なんでもきいてね。",
    images: [{ url: "/ogp.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PAUL bot",
    description: "永野広志（Paul）のAIチャットボット。なんでもきいてね。",
    images: ["/ogp.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geist.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

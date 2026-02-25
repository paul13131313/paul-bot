import type { Metadata } from "next";
import PortfolioClient from "./PortfolioClient";

export const metadata: Metadata = {
  title: "Portfolio | PAUL bot",
  description: "永野広志（Paul）の制作実績を3D空間で探索。87作品をインタラクティブに閲覧。",
  openGraph: {
    title: "Portfolio | PAUL bot",
    description: "永野広志（Paul）の制作実績を3D空間で探索。87作品をインタラクティブに閲覧。",
    images: [{ url: "/portfolio-ogp-page.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio | PAUL bot",
    description: "永野広志（Paul）の制作実績を3D空間で探索。87作品をインタラクティブに閲覧。",
    images: ["/portfolio-ogp-page.png"],
  },
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}

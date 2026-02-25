import { writeFileSync, mkdirSync, existsSync } from "fs";
import { createCanvas } from "canvas";
import { works } from "../app/portfolio/works-data";

const OGP_DIR = "public/portfolio-ogp";
const SIZE = 512;

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function extractOgImage(html: string): string | null {
  const match = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );
  if (match) return match[1];
  // content が先に来るパターン
  const match2 = html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
  );
  return match2 ? match2[1] : null;
}

function generatePlaceholder(title: string, category: string): Buffer {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // カテゴリごとの色
  const colors: Record<string, string> = {
    Graphic: "#e74c3c",
    Experiential: "#f39c12",
    Digital: "#3498db",
    Film: "#9b59b6",
    Branding: "#1abc9c",
    Campaign: "#2ecc71",
    Product: "#e67e22",
    "EC site": "#e67e22",
    "Virtual Event": "#8e44ad",
    "TV program": "#9b59b6",
    Workshop: "#27ae60",
    Bar: "#d35400",
    Photobook: "#16a085",
    "AI Product": "#00d4ff",
    "AI Practice": "#ff6bff",
  };

  const color = colors[category] || "#666666";

  // 背景グラデーション
  const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  gradient.addColorStop(0, "#0a0a0a");
  gradient.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // アクセントサークル
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, 120, 0, Math.PI * 2);
  ctx.fillStyle = color + "30";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, 80, 0, Math.PI * 2);
  ctx.fillStyle = color + "50";
  ctx.fill();

  // カテゴリテキスト
  ctx.fillStyle = color;
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(category, SIZE / 2, SIZE / 2 - 30);

  // タイトルテキスト（折り返し）
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  const maxWidth = SIZE - 60;
  const words = title.split("");
  let line = "";
  let y = SIZE / 2 + 10;
  for (const char of words) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth) {
      ctx.fillText(line, SIZE / 2, y);
      line = char;
      y += 36;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, SIZE / 2, y);

  return canvas.toBuffer("image/png");
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(filepath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(OGP_DIR)) {
    mkdirSync(OGP_DIR, { recursive: true });
  }

  const ogpMap: Record<string, string> = {};
  let fetched = 0;
  let placeholders = 0;

  for (const work of works) {
    const filepath = `${OGP_DIR}/${work.id}.png`;
    const publicPath = `/portfolio-ogp/${work.id}.png`;
    let success = false;

    // 1. YouTube サムネイル
    if (work.video) {
      const ytId = extractYouTubeId(work.video);
      if (ytId) {
        const thumbUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        success = await downloadImage(thumbUrl, filepath);
        if (success) {
          console.log(`[YT] ${work.id} ← ${thumbUrl}`);
          fetched++;
        }
      }
    }

    // 2. OGP画像取得
    if (!success && work.url) {
      try {
        const res = await fetchWithTimeout(work.url, 8000);
        if (res.ok) {
          const html = await res.text();
          let ogImage = extractOgImage(html);
          if (ogImage) {
            // 相対URLを絶対URLに変換
            if (ogImage.startsWith("/")) {
              const origin = new URL(work.url).origin;
              ogImage = origin + ogImage;
            } else if (!ogImage.startsWith("http")) {
              const base = work.url.endsWith("/")
                ? work.url
                : work.url + "/";
              ogImage = new URL(ogImage, base).href;
            }
            success = await downloadImage(ogImage, filepath);
            if (success) {
              console.log(`[OGP] ${work.id} ← ${ogImage}`);
              fetched++;
            }
          }
        }
      } catch {
        // フォールバックへ
      }
    }

    // 3. プレースホルダー生成
    if (!success) {
      const buf = generatePlaceholder(work.title, work.category);
      writeFileSync(filepath, buf);
      console.log(`[PLACEHOLDER] ${work.id}`);
      placeholders++;
    }

    ogpMap[work.id] = publicPath;
  }

  writeFileSync(
    "public/portfolio-ogp.json",
    JSON.stringify(ogpMap, null, 2)
  );
  console.log(
    `\nDone! Fetched: ${fetched}, Placeholders: ${placeholders}, Total: ${works.length}`
  );
}

main().catch(console.error);

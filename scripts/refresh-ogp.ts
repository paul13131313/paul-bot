/**
 * OGP画像の再取得・改善スクリプト
 * - YouTube動画のサムネイルを高解像度で再取得
 * - URLありの作品でOGPが小さいものを再取得
 * - 既存の大きい画像はスキップ
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const OGP_DIR = path.resolve("public/portfolio-ogp");
const OGP_JSON = path.resolve("public/portfolio-ogp.json");

// YouTube動画がある作品
const YOUTUBE_WORKS: Record<string, string> = {
  "otona-serifu": "U5BG1jaRW1k",
  "hands-te-kashimasu": "bXCW_koyxqI",
  "so-do": "wmSYBjWkxHI",
  "kinoko-yamabiko": "U04xehoh5dU",
  "kinoko-takehiko": "ZxjL82kWAi8",
  "shiranto": "ZCvnb_5Tm54",
  "bukkomi": "TY4Fx09PsNA",
  "costa-cruise": "ox4BEVp2i58",
  "oshi-jan": "XjAyQgVpd1s",
  "nijyumaru": "kxoUVnafMiY",
};

// URLがある作品（OGP再取得用）
const URL_WORKS: Record<string, string> = {
  "4d-selfie": "https://paul13131313.github.io/4d-selfie/",
  mafumaken: "https://mafumaken.tumblr.com/",
  "nonal-sakaba": "https://paul13131313.github.io/nonal-sakaba/",
  minoiro: "https://paul13131313.github.io/minoiro/",
  "mos-sofa": "https://paul13131313.github.io/mos-sofa/",
  gradation: "https://paul13131313.github.io/gradation/",
  "tosayama-ws": "https://paul13131313.github.io/tosayama-ws/",
  "doppuri-kochi": "https://paul13131313.github.io/doppuri-kochi/",
  "juken-quest": "https://paul13131313.github.io/juken-quest/",
  censored: "https://paul13131313.github.io/censored/",
  shaso: "https://paul13131313.github.io/shaso/",
  "ai-koubun": "https://paul13131313.github.io/ai-koubun/",
  ghost: "https://paul13131313.github.io/ghost/",
  "dark-scanner": "https://paul13131313.github.io/dark-scanner/",
  "video-factory": "https://paul13131313.github.io/video-factory/",
  birdman: "https://paul13131313.github.io/birdman/",
  vcc: "https://paul13131313.github.io/vcc/",
  hablemos: "https://paul13131313.github.io/hablemos/",
  "substance-map": "https://paul13131313.github.io/substance-map/",
  "machi-no-karte": "https://paul13131313.github.io/machi-no-karte/",
  "world-visual-data": "https://paul13131313.github.io/world-visual-data/",
  yaaawn: "https://paul13131313.github.io/yaaawn/",
  "infinite-loading": "https://paul13131313.github.io/infinite-loading/",
  babybabybaby: "https://paul13131313.github.io/babybabybaby/",
  sukashitara: "https://paul13131313.github.io/sukashitara/",
  "ura-shindan": "https://paul13131313.github.io/ura-shindan/",
  "big-money": "https://paul13131313.github.io/big-money/",
  densha: "https://paul13131313.github.io/densha/",
  "night-queen": "https://paul13131313.github.io/night-queen/",
  meeeeeeen: "https://paul13131313.github.io/meeeeeeen/",
  necoo: "https://paul13131313.github.io/necoo/",
  "generated-news": "https://paul13131313.github.io/generated-news/",
  "dm-to-pptx": "https://paul13131313.github.io/dm-to-pptx/",
  foodphoto: "https://paul13131313.github.io/foodphoto/",
  shred: "https://paul13131313.github.io/shred/",
  yoin: "https://paul13131313.github.io/yoin/",
  photomap: "https://paul13131313.github.io/photomap/",
  mypay: "https://paul13131313.github.io/mypay/",
  election: "https://paul13131313.github.io/election/",
  "web-theremin": "https://paul13131313.github.io/web-theremin/",
  touch: "https://paul13131313.github.io/touch/",
  goodsounds: "https://paul13131313.github.io/goodsounds/",
  kobutsu: "https://paul13131313.github.io/kobutsu/",
  condate: "https://paul13131313.github.io/condate/",
  "south-america": "https://paul13131313.github.io/south-america/",
  "body-particles": "https://paul13131313.github.io/body-particles/",
  "mirror-grid": "https://paul13131313.github.io/mirror-grid/",
  "folder-vision": "https://paul13131313.github.io/folder-vision/",
  "face-mirror": "https://paul13131313.github.io/face-mirror/",
  "particle-storm": "https://paul13131313.github.io/particle-storm/",
  "component-kit": "https://paul13131313.github.io/component-kit/",
  "motion-lab": "https://paul13131313.github.io/motion-lab/",
  "kanban-flow": "https://paul13131313.github.io/kanban-flow/",
  "live-board": "https://paul13131313.github.io/live-board/",
  "pixel-dodge": "https://paul13131313.github.io/pixel-dodge/",
  "scroll-stage": "https://paul13131313.github.io/scroll-stage/",
  "voice-memo": "https://paul13131313.github.io/voice-memo/",
  "fractal-dive": "https://paul13131313.github.io/fractal-dive/",
  "color-thief": "https://paul13131313.github.io/color-thief/",
  "skill-galaxy": "https://paul13131313.github.io/skill-galaxy/",
  "sync-pad": "https://paul13131313.github.io/sync-pad/",
  "air-synth": "https://paul13131313.github.io/air-synth/",
  "fluid-noise": "https://paul13131313.github.io/fluid-noise/",
  "sound-cosmos": "https://paul13131313.github.io/sound-cosmos/",
  "g-effector": "https://paul13131313.github.io/g-effector/",
};

// 最小サイズ: これ以下の画像は再取得対象
const MIN_SIZE = 15000; // 15KB

function fetchUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      // リダイレクトを追跡
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function extractOgImage(html: string): string | null {
  const match = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
    || html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:image"/i);
  return match ? match[1] : null;
}

async function fetchYouTubeThumbnail(id: string, videoId: string): Promise<boolean> {
  const outPath = path.join(OGP_DIR, `${id}.png`);

  // 高解像度 → 中解像度の順に試行
  const sizes = ["maxresdefault", "sddefault", "hqdefault"];
  for (const size of sizes) {
    const url = `https://img.youtube.com/vi/${videoId}/${size}.jpg`;
    try {
      const buf = await fetchUrl(url);
      if (buf.length > 5000) {
        fs.writeFileSync(outPath, buf);
        console.log(`  ✅ ${id}: YouTube ${size} (${(buf.length / 1024).toFixed(0)}KB)`);
        return true;
      }
    } catch {
      // 次のサイズを試行
    }
  }
  console.log(`  ❌ ${id}: YouTube サムネイル取得失敗`);
  return false;
}

async function fetchOgpImage(id: string, siteUrl: string): Promise<boolean> {
  const outPath = path.join(OGP_DIR, `${id}.png`);

  try {
    const htmlBuf = await fetchUrl(siteUrl);
    const html = htmlBuf.toString("utf-8");
    let ogImageUrl = extractOgImage(html);

    if (!ogImageUrl) {
      console.log(`  ⚠️  ${id}: og:image未発見`);
      return false;
    }

    // 相対URLを絶対URLに
    if (ogImageUrl.startsWith("/")) {
      const base = new URL(siteUrl);
      ogImageUrl = `${base.protocol}//${base.host}${ogImageUrl}`;
    } else if (!ogImageUrl.startsWith("http")) {
      ogImageUrl = new URL(ogImageUrl, siteUrl).toString();
    }

    const imgBuf = await fetchUrl(ogImageUrl);
    if (imgBuf.length > 3000) {
      fs.writeFileSync(outPath, imgBuf);
      console.log(`  ✅ ${id}: OGP (${(imgBuf.length / 1024).toFixed(0)}KB)`);
      return true;
    } else {
      console.log(`  ⚠️  ${id}: OGP画像が小さすぎる (${imgBuf.length}B)`);
      return false;
    }
  } catch (err: any) {
    console.log(`  ❌ ${id}: OGP取得失敗 (${err.message})`);
    return false;
  }
}

function needsRefresh(id: string): boolean {
  const filePath = path.join(OGP_DIR, `${id}.png`);
  if (!fs.existsSync(filePath)) return true;
  const stat = fs.statSync(filePath);
  return stat.size < MIN_SIZE;
}

async function main() {
  console.log("=== OGP画像の再取得開始 ===\n");

  let refreshed = 0;
  let failed = 0;

  // 1. YouTubeサムネイル
  console.log("📹 YouTube サムネイル再取得:");
  for (const [id, videoId] of Object.entries(YOUTUBE_WORKS)) {
    if (needsRefresh(id)) {
      const ok = await fetchYouTubeThumbnail(id, videoId);
      if (ok) refreshed++;
      else failed++;
    } else {
      console.log(`  ⏭  ${id}: スキップ（十分な画像あり）`);
    }
  }

  // 2. OGP再取得（小さい画像のみ）
  console.log("\n🌐 OGP画像 再取得（小さい画像のみ）:");
  for (const [id, url] of Object.entries(URL_WORKS)) {
    if (needsRefresh(id)) {
      const ok = await fetchOgpImage(id, url);
      if (ok) refreshed++;
      else failed++;
      // レート制限回避
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // 3. OGP JSONの更新
  const ogpJson: Record<string, string> = {};
  const files = fs.readdirSync(OGP_DIR);
  for (const f of files) {
    if (f.endsWith(".png") || f.endsWith(".jpg")) {
      const id = f.replace(/\.(png|jpg)$/, "");
      ogpJson[id] = `/portfolio-ogp/${f}`;
    }
  }
  fs.writeFileSync(OGP_JSON, JSON.stringify(ogpJson, null, 2));

  console.log(`\n=== 完了: ${refreshed}件更新, ${failed}件失敗 ===`);
  console.log(`OGPエントリ数: ${Object.keys(ogpJson).length}`);
}

main().catch(console.error);

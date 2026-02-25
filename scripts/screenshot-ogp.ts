/**
 * Puppeteerで各作品サイトのスクリーンショットを取得
 * プレースホルダーを本物のスクリーンショットに置き換える
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const OGP_DIR = path.resolve("public/portfolio-ogp");
const MIN_REAL_SIZE = 30000; // 30KB以上は本物のOGP

// URLがある作品でプレースホルダーのもの
const TARGETS: { id: string; url: string }[] = [
  // AI STUDIO WORKS
  { id: "juken-quest", url: "https://paul13131313.github.io/juken-quest/" },
  { id: "censored", url: "https://paul13131313.github.io/censored/" },
  { id: "shaso", url: "https://paul13131313.github.io/shaso/" },
  { id: "ai-koubun", url: "https://paul13131313.github.io/ai-koubun/" },
  { id: "ghost", url: "https://paul13131313.github.io/ghost/" },
  { id: "vcc", url: "https://paul13131313.github.io/vcc/" },
  { id: "substance-map", url: "https://paul13131313.github.io/substance-legality-map/" },
  { id: "yaaawn", url: "https://bless-you-seven.vercel.app/" },
  { id: "infinite-loading", url: "https://paul13131313.github.io/page-loader/" },
  { id: "dm-to-pptx", url: "https://paul13131313.github.io/dm-to-pptx/" },
  { id: "foodphoto", url: "https://paul13131313.github.io/foodphoto/" },
  { id: "shred", url: "https://paul13131313.github.io/shred/" },
  { id: "yoin", url: "https://paul13131313.github.io/yoin/" },
  { id: "photomap", url: "https://paul13131313.github.io/photomap/" },
  { id: "mypay", url: "https://paul13131313.github.io/mypay/" },
  { id: "election", url: "https://paul13131313.github.io/election/" },
  { id: "web-theremin", url: "https://paul13131313.github.io/web-theremin/" },
  { id: "touch", url: "https://paul13131313.github.io/touch/" },
  { id: "goodsounds", url: "https://paul13131313.github.io/goodsounds/" },
  { id: "kobutsu", url: "https://paul13131313.github.io/kobutsu/" },
  { id: "condate", url: "https://paul13131313.github.io/condate/" },
  { id: "south-america", url: "https://paul13131313.github.io/south-america/" },
  { id: "necoo", url: "https://necoo.vercel.app" },
  { id: "big-money", url: "https://future-asset-sim.vercel.app" },
  // AI STUDIO PRACTICE
  { id: "face-mirror", url: "https://paul13131313.github.io/face-mirror/" },
  { id: "component-kit", url: "https://paul13131313.github.io/component-kit/" },
  { id: "motion-lab", url: "https://paul13131313.github.io/motion-lab/" },
  { id: "kanban-flow", url: "https://paul13131313.github.io/kanban-flow/" },
  { id: "live-board", url: "https://paul13131313.github.io/live-board/" },
  { id: "pixel-dodge", url: "https://paul13131313.github.io/pixel-dodge/" },
  { id: "voice-memo", url: "https://paul13131313.github.io/voice-memo/" },
  { id: "fractal-dive", url: "https://paul13131313.github.io/fractal-dive/" },
  { id: "color-thief", url: "https://paul13131313.github.io/color-thief/" },
  { id: "skill-galaxy", url: "https://paul13131313.github.io/skill-galaxy/" },
  { id: "sync-pad", url: "https://paul13131313.github.io/sync-pad/" },
  { id: "air-synth", url: "https://paul13131313.github.io/air-synth/" },
  { id: "fluid-noise", url: "https://paul13131313.github.io/fluid-noise/" },
  { id: "g-effector", url: "https://paul13131313.github.io/g-effector/" },
  // クライアントワーク（URLあり）
  { id: "4d-selfie", url: "https://paul13131313.github.io/4d-selfie/" },
  { id: "nonal-sakaba", url: "https://paul13131313.github.io/nonal-sakaba/" },
  { id: "gradation", url: "https://paul13131313.github.io/gradation/" },
  { id: "tosayama-ws", url: "https://paul13131313.github.io/tosayama-ws/" },
  { id: "doppuri-kochi", url: "https://paul13131313.github.io/doppuri-kochi/" },
  { id: "minoiro", url: "https://paul13131313.github.io/minoiro/" },
  { id: "mos-sofa", url: "https://paul13131313.github.io/mos-sofa/" },
];

// YouTube動画がある作品 → サムネイルを取得
const YOUTUBE_TARGETS: { id: string; videoId: string }[] = [
  { id: "otona-serifu", videoId: "U5BG1jaRW1k" },
  { id: "hands-te-kashimasu", videoId: "bXCW_koyxqI" },
  { id: "so-do", videoId: "wmSYBjWkxHI" },
  { id: "kinoko-yamabiko", videoId: "U04xehoh5dU" },
  { id: "kinoko-takehiko", videoId: "ZxjL82kWAi8" },
  { id: "shiranto", videoId: "ZCvnb_5Tm54" },
  { id: "bukkomi", videoId: "TY4Fx09PsNA" },
  { id: "costa-cruise", videoId: "ox4BEVp2i58" },
  { id: "oshi-jan", videoId: "XjAyQgVpd1s" },
  { id: "nijyumaru", videoId: "kxoUVnafMiY" },
];

function needsUpdate(id: string): boolean {
  const filePath = path.join(OGP_DIR, `${id}.png`);
  if (!fs.existsSync(filePath)) return true;
  const stat = fs.statSync(filePath);
  return stat.size < MIN_REAL_SIZE;
}

async function main() {
  // まずYouTubeサムネイル（needsUpdateのもの）
  console.log("=== YouTubeサムネイル ===");
  for (const { id, videoId } of YOUTUBE_TARGETS) {
    if (!needsUpdate(id)) {
      console.log(`  ⏭  ${id}: スキップ`);
      continue;
    }
    const sizes = ["maxresdefault", "sddefault", "hqdefault"];
    let downloaded = false;
    for (const size of sizes) {
      try {
        const url = `https://img.youtube.com/vi/${videoId}/${size}.jpg`;
        const outPath = path.join(OGP_DIR, `${id}.png`);
        execSync(`curl -sL -o "${outPath}" "${url}"`, { timeout: 10000 });
        const stat = fs.statSync(outPath);
        if (stat.size > 5000) {
          console.log(`  ✅ ${id}: YouTube ${size} (${Math.round(stat.size / 1024)}KB)`);
          downloaded = true;
          break;
        }
      } catch {}
    }
    if (!downloaded) console.log(`  ❌ ${id}: 取得失敗`);
  }

  // Puppeteerでスクリーンショット
  const toCapture = TARGETS.filter(t => needsUpdate(t.id));
  console.log(`\n=== スクリーンショット取得 (${toCapture.length}件) ===`);

  if (toCapture.length > 0) {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });

    for (const { id, url } of toCapture) {
      try {
        console.log(`📷 ${id}: ${url}`);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000)); // 描画待ち

        const outPath = path.join(OGP_DIR, `${id}.png`);
        await page.screenshot({ path: outPath, type: "png" });

        const stat = fs.statSync(outPath);
        console.log(`  ✅ ${(stat.size / 1024).toFixed(0)}KB`);
      } catch (err: any) {
        console.log(`  ❌ ${err.message}`);
      }
    }

    await browser.close();
  }

  // クライアントワーク（URLなし）はスキップ
  const noUrlWorks = [
    "hands-mono-ken", "ashita-no-watashi", "niomon", "ugoku-zasshi",
    "unmei-karikae", "tachikoma", "jugatsuya", "net-tantei",
    "tokyo-creative-hunting", "communitio", "17live", "ofuro-manner"
  ];
  console.log("\n=== URLなしクライアントワーク（現状のまま）===");
  for (const id of noUrlWorks) {
    console.log(`  ⚠️  ${id}: URLなし（iCloud素材でカバー要）`);
  }

  console.log("\n=== 完了 ===");
}

main().catch(console.error);

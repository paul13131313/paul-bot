const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const WIDTH = 1200;
const HEIGHT = 630;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

// Background gradient
const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
gradient.addColorStop(0, "#09090b");
gradient.addColorStop(1, "#18181b");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Title
ctx.fillStyle = "#ffffff";
ctx.font = "bold 80px monospace";
ctx.textAlign = "center";
ctx.fillText("PAUL bot", WIDTH / 2, 280);

// Subtitle
ctx.fillStyle = "#a1a1aa";
ctx.font = "28px sans-serif";
ctx.fillText("なんでもきいてね", WIDTH / 2, 360);

// Dot accent
ctx.fillStyle = "#3b82f6";
ctx.beginPath();
ctx.arc(WIDTH / 2, 480, 4, 0, Math.PI * 2);
ctx.fill();

const outPath = path.join(__dirname, "..", "public", "ogp.png");
const buffer = canvas.toBuffer("image/png");
fs.writeFileSync(outPath, buffer);
console.log("OGP image generated:", outPath);

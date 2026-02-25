import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";
import { works } from "../app/portfolio/works-data";

async function main() {
  const client = new Anthropic();

  const workList = works
    .map(
      (w, i) =>
        `${i + 1}. id="${w.id}" | ${w.title} | ${w.client} | ${w.category} | ${w.description}`
    )
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `以下の${works.length}個の作品リストについて、各作品の3D座標(x, y, z)を-10〜10の範囲で割り当ててください。

ルール:
- 意味的に似た作品は近い座標に配置すること
- 映像系（Film, CM）は近くに
- ブランディング系（Branding, Campaign）は近くに
- プロダクト系（Product, EC site）は近くに
- デジタル/インタラクティブ系（Digital, Experiential）は近くに
- AI Product（自主制作デジタルプロダクト）は近くに
- AI Practice（技術実験）は近くに
- ただし同じクラスタ内でもバラけさせて、全体として球体状に分布するように
- 座標は小数点1桁まで

以下のJSONフォーマットで返してください（他のテキストは不要）:
{
  "作品id": { "x": 0.0, "y": 0.0, "z": 0.0 },
  ...
}

作品リスト:
${workList}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // JSON部分を抽出（マークダウンコードブロックに包まれている可能性）
  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const positions = JSON.parse(jsonStr);

  // 全作品が含まれているか検証
  const missingIds = works.filter((w) => !positions[w.id]).map((w) => w.id);
  if (missingIds.length > 0) {
    console.warn(`Missing positions for: ${missingIds.join(", ")}`);
    // 欠落した作品にはランダム座標を割り当て
    for (const id of missingIds) {
      positions[id] = {
        x: Math.round((Math.random() * 20 - 10) * 10) / 10,
        y: Math.round((Math.random() * 20 - 10) * 10) / 10,
        z: Math.round((Math.random() * 20 - 10) * 10) / 10,
      };
    }
  }

  writeFileSync(
    "public/portfolio-positions.json",
    JSON.stringify(positions, null, 2)
  );
  console.log(
    `Generated positions for ${Object.keys(positions).length} works → public/portfolio-positions.json`
  );
}

main().catch(console.error);

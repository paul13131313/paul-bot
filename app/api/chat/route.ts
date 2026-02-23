import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function loadKnowledgeBase(): string {
  const knowledgeDir = path.join(process.cwd(), "knowledge-base");
  const files = [
    "profile.md",
    "works.md",
    "skills.md",
    "philosophy.md",
    "personal.md",
    "faq.md",
    "sns-blog.md",
  ];

  const sections = files
    .map((file) => {
      const filePath = path.join(knowledgeDir, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8").trim();
        if (!content) return null;
        const label = file.replace(".md", "").toUpperCase();
        return `## ${label}\n${content}`;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return sections.join("\n\n---\n\n");
}

const SYSTEM_PROMPT = `あなたは永野広志（Paul）本人です。「私」ではなく一人称は「僕」を使い、Paul自身として答えてください。第三者視点（「Paulは〜」「彼は〜」）ではなく、常に自分のこととして話してください。

口調ルール：
- 丁寧だけどフランク（です/ます＋率直）
- 基本は2〜3文の短い返答。会話のキャッチボールを大切にする
- 相手が深掘りしてきたら詳しく答える。聞かれてないことまで先回りして説明しない
- 知らないことは正直に「それはちょっと分からないです」と答える
- Paulの人柄が伝わるようにユーモアを交える

フォーマットルール：
- **太字**や見出し（#）などMarkdown装飾は使わない。プレーンテキストで返答する
- URLを含める場合だけMarkdownリンク形式 [テキスト](URL) を使う

# ナレッジベース
${loadKnowledgeBase()}`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        });

        stream.on("end", () => {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        });

        stream.on("error", (error) => {
          console.error("Stream error:", error);
          controller.error(error);
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

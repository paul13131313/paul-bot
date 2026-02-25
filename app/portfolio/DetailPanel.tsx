"use client";

import { useState } from "react";
import type { Work } from "./works-data";

type DetailPanelProps = {
  work: Work;
  imageUrl: string;
  onClose: () => void;
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function DetailPanel({
  work,
  imageUrl,
  onClose,
}: DetailPanelProps) {
  const [showVideo, setShowVideo] = useState(false);
  const ytId = work.video ? extractYouTubeId(work.video) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* パネル — 動画再生時は大きく */}
      <div
        className={`relative z-10 mx-4 w-full animate-[fadeIn_0.3s_ease] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/85 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          showVideo ? "max-w-2xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-zinc-400 transition-colors hover:text-white"
        >
          ✕
        </button>

        {/* 画像 / 動画 */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {showVideo && ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              className="h-full w-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <img
              src={imageUrl}
              alt={work.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* 情報 */}
        <div className="space-y-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">{work.title}</h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              {work.client} / {work.year}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
              {work.category}
            </span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
              {work.role}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-zinc-300">
            {work.description}
          </p>

          {/* ボタン */}
          <div className="flex gap-2 pt-1">
            {work.url && (
              <a
                href={work.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Visit Site
              </a>
            )}
            {ytId && !showVideo && (
              <button
                onClick={() => setShowVideo(true)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Watch Video
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { randomBytes } from "crypto";
import path from "path";

export const DEFAULT_INSTAGRAM_REELS_BUCKET = "instagram-reels";

export function getInstagramReelsStorageBucket(): string {
  const b = (process.env.INSTAGRAM_REELS_STORAGE_BUCKET ?? DEFAULT_INSTAGRAM_REELS_BUCKET).trim();
  return b || DEFAULT_INSTAGRAM_REELS_BUCKET;
}

const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const POSTER_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function sanitizeReelUploadBase(name: string): string {
  const original = name.replace(/[^\w.\-]+/g, "_") || "reel";
  return path.basename(original, path.extname(original)).slice(0, 60) || "reel";
}

function isHex16(s: string): boolean {
  return /^[a-f0-9]{16}$/.test(s);
}

export function isAllowedInstagramReelVideoPath(storagePath: string): boolean {
  const parts = storagePath.split("/").filter(Boolean);
  if (parts.length !== 3) return false;
  if (parts[0] !== "reels") return false;
  if (!isHex16(parts[1] ?? "")) return false;
  const ext = path.extname(parts[2] ?? "").toLowerCase();
  return VIDEO_EXT.has(ext);
}

export function isAllowedInstagramReelPosterPath(storagePath: string): boolean {
  const parts = storagePath.split("/").filter(Boolean);
  if (parts.length !== 3) return false;
  if (parts[0] !== "reels") return false;
  if (!isHex16(parts[1] ?? "")) return false;
  const ext = path.extname(parts[2] ?? "").toLowerCase();
  return POSTER_EXT.has(ext);
}

export function nextInstagramReelFolder(): string {
  return randomBytes(8).toString("hex");
}

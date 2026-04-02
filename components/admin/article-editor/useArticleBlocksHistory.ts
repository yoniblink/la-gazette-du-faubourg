"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArticleBlock } from "@/lib/article-blocks/types";

const MAX_HISTORY = 40;
const DEBOUNCE_MS = 420;

function cloneBlocks(b: ArticleBlock[]): ArticleBlock[] {
  return structuredClone(b) as ArticleBlock[];
}

function blocksEqual(a: ArticleBlock[], b: ArticleBlock[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useArticleBlocksHistory(initialBlocks: ArticleBlock[]) {
  const [blocks, setBlocksState] = useState<ArticleBlock[]>(initialBlocks);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const pastRef = useRef<ArticleBlock[][]>([]);
  const futureRef = useRef<ArticleBlock[][]>([]);
  const burstBeforeRef = useRef<ArticleBlock[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncFlags = useCallback((nextBlocks: ArticleBlock[]) => {
    const before = burstBeforeRef.current;
    const canUndoNext =
      pastRef.current.length > 0 || (before !== null && !blocksEqual(before, nextBlocks));
    const canRedoNext = futureRef.current.length > 0;
    setCanUndo(canUndoNext);
    setCanRedo(canRedoNext);
  }, []);

  const flushBurst = useCallback(() => {
    debounceRef.current = null;
    const before = burstBeforeRef.current;
    if (!before) return;
    const current = blocksRef.current;
    if (blocksEqual(before, current)) {
      syncFlags(current);
      return;
    }
    pastRef.current = [...pastRef.current, before].slice(-MAX_HISTORY);
    futureRef.current = [];
    burstBeforeRef.current = null;
    syncFlags(current);
  }, [syncFlags]);

  const setBlocks = useCallback(
    (next: ArticleBlock[] | ((prev: ArticleBlock[]) => ArticleBlock[])) => {
      if (burstBeforeRef.current === null) {
        burstBeforeRef.current = cloneBlocks(blocksRef.current);
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flushBurst, DEBOUNCE_MS);
      setBlocksState((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: ArticleBlock[]) => ArticleBlock[])(prev) : next;
        queueMicrotask(() => syncFlags(resolved));
        return resolved;
      });
    },
    [flushBurst, syncFlags],
  );

  const undo = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const current = blocksRef.current;
    const beforeBurst = burstBeforeRef.current;
    burstBeforeRef.current = null;

    if (beforeBurst !== null && !blocksEqual(beforeBurst, current)) {
      futureRef.current = [...futureRef.current, cloneBlocks(current)];
      const nextBlocks = cloneBlocks(beforeBurst);
      setBlocksState(nextBlocks);
      queueMicrotask(() => syncFlags(nextBlocks));
      return;
    }

    if (pastRef.current.length === 0) {
      syncFlags(current);
      return;
    }

    const prevSnap = pastRef.current[pastRef.current.length - 1]!;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, cloneBlocks(current)];
    const nextBlocks = cloneBlocks(prevSnap);
    setBlocksState(nextBlocks);
    queueMicrotask(() => syncFlags(nextBlocks));
  }, [syncFlags]);

  const redo = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    burstBeforeRef.current = null;
    if (futureRef.current.length === 0) {
      syncFlags(blocksRef.current);
      return;
    }
    const current = blocksRef.current;
    const nextSnap = futureRef.current[futureRef.current.length - 1]!;
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, cloneBlocks(current)].slice(-MAX_HISTORY);
    const nextBlocks = cloneBlocks(nextSnap);
    setBlocksState(nextBlocks);
    queueMicrotask(() => syncFlags(nextBlocks));
  }, [syncFlags]);

  return { blocks, setBlocks, undo, redo, canUndo, canRedo };
}

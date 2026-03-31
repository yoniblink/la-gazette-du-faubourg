"use client";

import { useCallback, useRef, useState } from "react";
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
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const pastRef = useRef<ArticleBlock[][]>([]);
  const futureRef = useRef<ArticleBlock[][]>([]);
  const burstBeforeRef = useRef<ArticleBlock[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, bumpHistory] = useState(0);
  const bump = useCallback(() => {
    bumpHistory((v) => v + 1);
  }, [bumpHistory]);

  const flushBurst = useCallback(() => {
    debounceRef.current = null;
    const before = burstBeforeRef.current;
    burstBeforeRef.current = null;
    if (!before) return;
    const current = blocksRef.current;
    if (blocksEqual(before, current)) {
      bump();
      return;
    }
    pastRef.current = [...pastRef.current, before].slice(-MAX_HISTORY);
    futureRef.current = [];
    bump();
  }, [bump]);

  const setBlocks = useCallback(
    (next: ArticleBlock[] | ((prev: ArticleBlock[]) => ArticleBlock[])) => {
      setBlocksState((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: ArticleBlock[]) => ArticleBlock[])(prev) : next;
        if (burstBeforeRef.current === null) burstBeforeRef.current = cloneBlocks(prev);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(flushBurst, DEBOUNCE_MS);
        return resolved;
      });
    },
    [flushBurst],
  );

  const undo = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const beforeBurst = burstBeforeRef.current;
    burstBeforeRef.current = null;

    setBlocksState((current) => {
      if (beforeBurst !== null && !blocksEqual(beforeBurst, current)) {
        futureRef.current = [...futureRef.current, cloneBlocks(current)];
        bump();
        return cloneBlocks(beforeBurst);
      }
      if (pastRef.current.length === 0) return current;
      const prevSnap = pastRef.current[pastRef.current.length - 1]!;
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, cloneBlocks(current)];
      bump();
      return cloneBlocks(prevSnap);
    });
  }, [bump]);

  const redo = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    burstBeforeRef.current = null;
    if (futureRef.current.length === 0) return;
    setBlocksState((current) => {
      const nextSnap = futureRef.current[futureRef.current.length - 1]!;
      futureRef.current = futureRef.current.slice(0, -1);
      pastRef.current = [...pastRef.current, cloneBlocks(current)].slice(-MAX_HISTORY);
      bump();
      return cloneBlocks(nextSnap);
    });
  }, [bump]);

  const canUndo =
    pastRef.current.length > 0 ||
    (burstBeforeRef.current !== null && !blocksEqual(burstBeforeRef.current, blocks));

  const canRedo = futureRef.current.length > 0;

  return { blocks, setBlocks, undo, redo, canUndo, canRedo };
}

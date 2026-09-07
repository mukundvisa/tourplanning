"use client";

import React from "react";
import toast from "react-hot-toast";
import { RotateCcw, Trash2 } from "lucide-react";

interface DeleteWithUndoOptions<T> {
  item: T;
  itemType: string;
  itemName?: string;
  onOptimisticRemove: (item: T) => void;
  onUndo: (item: T) => void;
  onPermanentDelete: (item: T) => Promise<any>;
  durationMs?: number;
}

export function executeDeleteWithUndo<T>({
  item,
  itemType,
  itemName,
  onOptimisticRemove,
  onUndo,
  onPermanentDelete,
  durationMs = 5000,
}: DeleteWithUndoOptions<T>) {
  // 1. Immediately remove from UI (optimistic update)
  onOptimisticRemove(item);

  let isUndone = false;

  // 2. Schedule actual permanent database delete after durationMs
  const timer = setTimeout(async () => {
    if (!isUndone) {
      try {
        await onPermanentDelete(item);
      } catch (err) {
        console.error(`Error deleting ${itemType}:`, err);
        toast.error(`Failed to delete ${itemName || itemType}. Restoring...`);
        onUndo(item);
      }
    }
  }, durationMs);

  const displayTitle = itemName ? `${itemType} "${itemName}"` : itemType;

  // 3. Show non-blocking Undo Toast
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full bg-[#14213D] text-white shadow-2xl rounded-xl pointer-events-auto flex items-center justify-between p-3.5 border border-[#B8944F]/40`}
      >
        <div className="flex items-center space-x-3 pr-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {displayTitle} deleted
            </p>
            <p className="text-[10px] text-zinc-400">
              Auto-deleting permanently in 5s
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            isUndone = true;
            clearTimeout(timer);
            toast.dismiss(t.id);
            onUndo(item);
            toast.success(`${displayTitle} restored`, {
              duration: 2500,
              style: {
                background: "#14213D",
                color: "#DDA74F",
                border: "1px solid rgba(184, 148, 79, 0.4)",
                fontSize: "12px",
                fontWeight: "600",
              },
            });
          }}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 ml-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Undo</span>
        </button>
      </div>
    ),
    {
      duration: durationMs,
      position: "bottom-right",
    }
  );
}

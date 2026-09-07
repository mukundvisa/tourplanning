"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis if needed
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-100 ${className}`}
    >
      <p className="text-xs text-zinc-500 font-medium">
        Showing <span className="font-semibold text-[#14213D]">{startItem}</span> to{" "}
        <span className="font-semibold text-[#14213D]">{endItem}</span> of{" "}
        <span className="font-semibold text-[#14213D]">{totalItems}</span> entries
      </p>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:border-[#B8944F] hover:text-[#B8944F] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page, idx) =>
          typeof page === "number" ? (
            <button
              key={idx}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] h-8 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                currentPage === page
                  ? "bg-[#14213D] text-[#DDA74F] shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 border border-transparent hover:border-zinc-200"
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={idx} className="px-1 text-xs text-zinc-400">
              ...
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md border border-zinc-200 text-zinc-600 hover:border-[#B8944F] hover:text-[#B8944F] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

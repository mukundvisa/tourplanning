"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface MasterTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MasterDataTabSliderProps {
  tabs: MasterTabItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  className?: string;
}

export function MasterDataTabSlider({
  tabs,
  activeTab,
  onSelectTab,
  className = "",
}: MasterDataTabSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [tabs]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
    setTimeout(checkScroll, 300);
  }, [activeTab]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 240;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={`relative flex items-center w-full min-w-0 bg-white ${className}`}>
      {/* Left Scroll Button */}
      {canScrollLeft && (
        <div className="absolute left-0 z-30 h-full flex items-center bg-gradient-to-r from-white via-white/95 to-transparent pr-4 pl-1">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            className="p-1.5 rounded-full bg-white shadow-md border border-zinc-200 text-zinc-600 hover:text-[#B8944F] hover:border-[#B8944F] transition-all cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Scrollable Tabs Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center space-x-1.5 overflow-x-auto scroll-smooth py-2.5 px-2 sm:px-4 w-full no-scrollbar select-none"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#B8944F] text-white shadow-xs font-bold border border-[#B8944F]"
                  : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-[#14213D] border border-zinc-200/70"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 ${
                  isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Scroll Button */}
      {canScrollRight && (
        <div className="absolute right-0 z-30 h-full flex items-center bg-gradient-to-l from-white via-white/95 to-transparent pl-4 pr-1">
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            className="p-1.5 rounded-full bg-white shadow-md border border-zinc-200 text-zinc-600 hover:text-[#B8944F] hover:border-[#B8944F] transition-all cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

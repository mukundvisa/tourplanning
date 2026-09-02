import React from "react";

export function Logo({
  className = "h-9",
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <img
        src="/brand-logo.png"
        alt="TripPlanner"
        className="h-full w-auto aspect-square rounded-full object-cover shadow-2xs border border-zinc-200/80"
      />
      {showText && (
        <span className="text-lg font-black text-[#14213D] font-fraunces tracking-tight whitespace-nowrap">
          Trip<span className="text-[#B8944F]">Planner</span>
        </span>
      )}
    </div>
  );
}

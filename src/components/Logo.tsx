import React from "react";

export function Logo({ className = "h-10" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* SVG drawing matches the "TripCraft" logo mark and typography */}
      <svg
        viewBox="0 0 250 85"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Geometric Origami Compass / Paper Plane in Teal, Amber, and Slate */}
        <path
          d="M15 25 L45 35 L28 45 Z"
          fill="#0DA590"
          opacity="0.9"
        />
        <path
          d="M45 35 L32 55 L28 45 Z"
          fill="#F59E0B"
          opacity="0.9"
        />
        <path
          d="M15 25 L28 45 L32 55 Z"
          fill="#1E3B39"
          opacity="0.8"
        />
        <circle cx="45" cy="35" r="2.5" fill="#FF176B" />

        {/* Text "TripCraft" in deep slate */}
        <text
          x="62"
          y="48"
          fill="#1E3B39"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="26"
          letterSpacing="-0.5"
        >
          Trip
          <tspan fill="#0DA590">Craft</tspan>
        </text>
      </svg>
    </div>
  );
}

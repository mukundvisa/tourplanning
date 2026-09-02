"use client";

import React from "react";
import {
  Compass,
  Calendar,
  Database,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface OverviewTabProps {
  stats: {
    totalTrips: number;
    tripsThisMonth: number;
    totalMasterRecords: number;
    avgMargin: number;
    chartData: { month: string; trips: number; revenue: number }[];
  };
}

export function OverviewTab({ stats }: OverviewTabProps) {
  const cards = [
    {
      label: "Total Trips Created",
      value: stats.totalTrips.toLocaleString(),
      subtext: "Across all active destinations",
      icon: Compass,
      accent: "border-[#14213D]/15 text-[#14213D]",
      bg: "bg-white",
      badge: "Lifetime",
    },
    {
      label: "Trips This Month",
      value: stats.tripsThisMonth.toString(),
      subtext: "New custom client blueprints",
      icon: Calendar,
      accent: "border-[#B8944F]/30 text-[#B8944F]",
      bg: "bg-white",
      badge: "Current Month",
    },
    {
      label: "Master Data Records",
      value: stats.totalMasterRecords.toLocaleString(),
      subtext: "Cities, Hotels, Flights & Templates",
      icon: Database,
      accent: "border-[#2B2E36]/20 text-[#2B2E36]",
      bg: "bg-white",
      badge: "13 Catalogues",
    },
    {
      label: "Average Profit Margin",
      value: `${stats.avgMargin}%`,
      subtext: "Target benchmark: 20-30%",
      icon: TrendingUp,
      accent: "border-[#6B7A5E]/40 text-[#6B7A5E]",
      bg: "bg-[#6B7A5E]/5",
      badge: "Admin Sage",
      isSage: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-lg border ${card.accent} ${card.bg} craft-card relative overflow-hidden transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-semibold text-zinc-500 tracking-normal">
                  {card.label}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    card.isSage
                      ? "bg-[#6B7A5E]/15 text-[#6B7A5E]"
                      : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                  }`}
                >
                  {card.badge}
                </span>
              </div>

              <div className="flex items-baseline space-x-2">
                <span
                  className={`text-3xl font-extrabold tracking-tight ${
                    card.isSage ? "text-[#6B7A5E]" : "text-[#14213D]"
                  }`}
                >
                  {card.value}
                </span>
              </div>

              <p className="text-xs text-zinc-400 mt-1 flex items-center">
                <Icon className="h-3.5 w-3.5 mr-1 inline opacity-60" />
                {card.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart Section */}
      <div className="bg-white border border-[#B8944F]/20 rounded-lg p-6 craft-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-4 border-b border-zinc-100 gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#14213D] font-fraunces">
              Trip Itinerary Generation Velocity
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Monthly distribution of custom travel proposals created in TripPlanner Workspace (last 12 months)
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#B8944F]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#B8944F]" />
            <span>Trips Created</span>
          </div>
        </div>

        <div className="h-[280px] sm:h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3ECDD" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#8F6F33"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#E4DEC9" }}
              />
              <YAxis
                stroke="#8F6F33"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#E4DEC9" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#14213D",
                  color: "#FAF8F5",
                  borderRadius: "8px",
                  border: "1px solid #B8944F",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(20,33,61,0.15)",
                }}
                formatter={(value: any) => [`${value} Trips`, "Created"]}
                labelStyle={{ color: "#B8944F", fontWeight: "bold" }}
              />
              <Bar
                dataKey="trips"
                fill="#B8944F"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

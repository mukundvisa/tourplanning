"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  User,
  Percent,
  Tag,
  Compass,
  BedDouble,
  Plane,
  Bus,
  Ticket,
  UtensilsCrossed,
  FileText,
  Type,
  Image as ImageIcon,
  Calculator,
  Menu,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Globe,
  DollarSign,
  Briefcase,
  X,
} from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { CitiesTab } from "./CitiesTab";
import { ConsultantsTab } from "./ConsultantsTab";
import { TaxSettingsTab } from "./TaxSettingsTab";
import { PricingLabelsTab } from "./PricingLabelsTab";
import { ActivitiesTab } from "./ActivitiesTab";
import { HotelsTab } from "./HotelsTab";
import { FlightRoutesTab } from "./FlightRoutesTab";
import { AddOnsTab } from "./AddOnsTab";
import { RestaurantsTab } from "./RestaurantsTab";
import { PolicyTemplatesTab } from "./PolicyTemplatesTab";
import { BannerImagesTab } from "./BannerImagesTab";
import { AdminCostCalculationTab } from "./AdminCostCalculationTab";

interface MasterDataHubProps {
  overviewStats: any;
  cities: any[];
  consultants: any[];
  taxSettings: any[];
  pricingLabels: any[];
  activities: any[];
  hotels: any[];
  flightRoutes: any[];
  addOns: any[];
  restaurants: any[];
  policyTemplates: any[];
  bannerImages: any[];
  tripsForCost: any[];
  costRates: any[];
}

const TABS = [
  { id: "banners", label: "Banner Images", icon: ImageIcon },
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "cities", label: "Cities & States", icon: MapPin },
  { id: "consultants", label: "Consultants", icon: User },
  { id: "tax", label: "Tax Settings", icon: Percent },
  { id: "activities", label: "Activities", icon: Compass },
  { id: "hotels", label: "Hotels", icon: BedDouble },
  { id: "flights", label: "Transportation", icon: Bus },
  { id: "addons", label: "Add-ons & Visa", icon: Ticket },
  { id: "restaurants", label: "Restaurants", icon: UtensilsCrossed },
  { id: "policies", label: "Policy Templates", icon: FileText },
  { id: "pricing", label: "Pricing", icon: Tag },
];

function MasterDataHubContent(props: MasterDataHubProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#14213D] flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200/80 px-4 sm:px-6 h-16 flex items-center justify-between shadow-2xs">
        {/* Left: Hamburger & Breadcrumb */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileSidebarOpen(!isMobileSidebarOpen);
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }
            }}
            className="p-2 rounded-lg text-zinc-600 hover:text-[#14213D] hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-xs">
            <Link
              href="/"
              className="text-zinc-400 hover:text-[#14213D] font-medium transition-colors hidden sm:inline"
            >
              Workspace Console
            </Link>
            <span className="text-zinc-300 hidden sm:inline">/</span>
            <span className="font-bold text-[#14213D] truncate max-w-[160px] sm:max-w-xs">
              {activeTab === "costing" ? "Admin Cost Engine" : "Master Data Hub"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Body Layout with Sidebar */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Collapsible Sidebar */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 z-40 md:z-auto bg-white border-r border-zinc-200/80 flex flex-col justify-between
            transition-[width,transform] duration-250 ease-in-out
            ${isMobileSidebarOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"}
            ${isSidebarCollapsed ? "md:w-16" : "md:w-64"}
          `}
        >
          <div>
            {/* Wordmark (Fraunces Text-only — no icon logo) */}
            <div className="h-16 px-5 border-b border-zinc-100 flex items-center justify-between">
              {!isSidebarCollapsed ? (
                <span className="text-xl font-bold text-[#14213D] font-fraunces tracking-tight">
                  TripCraft
                </span>
              ) : (
                <span className="text-xl font-bold text-[#14213D] font-fraunces mx-auto">
                  TC
                </span>
              )}
              {/* Close on mobile */}
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="md:hidden text-zinc-400 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Section */}
            <div className="p-3 space-y-1">
              <Link
                href="/"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-[#14213D] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 text-zinc-400 shrink-0" />
                {!isSidebarCollapsed && <span>Return to Console</span>}
              </Link>
              <Link
                href="/trips/new"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-[#14213D] transition-colors cursor-pointer"
              >
                <Compass className="h-4 w-4 text-[#B8944F] shrink-0" />
                {!isSidebarCollapsed && <span>Create Trip Blueprint</span>}
              </Link>
            </div>

            <div className="px-3 pt-3 border-t border-zinc-100">
              <p className={`text-[10px] uppercase font-bold text-zinc-400 px-3 mb-2 ${isSidebarCollapsed ? "hidden" : "block"}`}>
                Quick Navigation
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("overview");
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-[#B8944F]/15 text-[#B8944F] font-bold"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  {!isSidebarCollapsed && <span>Analytics Overview</span>}
                </button>
                <button
                  onClick={() => {
                    setActiveTab("costing");
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "costing"
                      ? "bg-[#6B7A5E]/20 text-[#6B7A5E] font-bold"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Calculator className="h-4 w-4 text-[#6B7A5E] shrink-0" />
                  {!isSidebarCollapsed && <span>Admin Cost Engine</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Bottom Footer */}
          <div className="p-4 border-t border-zinc-100 text-center">
            {!isSidebarCollapsed ? (
              <div className="text-[11px] text-zinc-400">
                <p className="font-semibold text-zinc-600">TripCraft Workspace</p>
                <p>Internal Travel Operations</p>
              </div>
            ) : (
              <div className="text-[10px] font-bold text-[#B8944F]">TC</div>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Horizontal Icon-Tab Strip (Master Data Tabs only - No Cost Calculation in Header Tabs) */}
          <div className="bg-white border-b border-zinc-200/80 px-4 sm:px-6 sticky top-0 z-20 shadow-2xs">
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-2.5">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                let activeStyles = "text-zinc-500 hover:text-[#14213D] hover:bg-zinc-50";
                if (isActive) {
                  activeStyles = "text-[#B8944F] font-bold border-b-2 border-[#B8944F] bg-[#B8944F]/8 rounded-b-none";
                }

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${activeStyles}`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${
                        isActive
                          ? "text-[#B8944F]"
                          : "text-zinc-400"
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Tab Panel Content */}
          <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto">
            {activeTab === "overview" && <OverviewTab stats={props.overviewStats} />}
            {activeTab === "costing" && (
              <AdminCostCalculationTab
                trips={props.tripsForCost}
                costRates={props.costRates}
              />
            )}
            {activeTab === "cities" && <CitiesTab initialData={props.cities} />}
            {activeTab === "consultants" && (
              <ConsultantsTab initialData={props.consultants} cities={props.cities} />
            )}
            {activeTab === "tax" && <TaxSettingsTab initialData={props.taxSettings} />}
            {activeTab === "pricing" && (
              <PricingLabelsTab initialData={props.pricingLabels} />
            )}
            {activeTab === "activities" && (
              <ActivitiesTab initialData={props.activities} cities={props.cities} />
            )}
            {activeTab === "hotels" && (
              <HotelsTab initialData={props.hotels} cities={props.cities} />
            )}
            {activeTab === "flights" && (
              <FlightRoutesTab initialData={props.flightRoutes} />
            )}
            {activeTab === "addons" && (
              <AddOnsTab initialData={props.addOns} />
            )}
            {activeTab === "restaurants" && (
              <RestaurantsTab initialData={props.restaurants} cities={props.cities} />
            )}
            {activeTab === "policies" && (
              <PolicyTemplatesTab initialData={props.policyTemplates} />
            )}
            {activeTab === "banners" && (
              <BannerImagesTab initialData={props.bannerImages} cities={props.cities} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export function MasterDataHub(props: MasterDataHubProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500 font-medium">Loading workspace...</div>}>
      <MasterDataHubContent {...props} />
    </Suspense>
  );
}

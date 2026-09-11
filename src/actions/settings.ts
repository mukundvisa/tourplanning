"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface SiteLogoSettings {
  logoUrl: string | null;
  watermarkOpacity: number;
}

export async function getSiteLogoSettings(): Promise<{ success: boolean; data: SiteLogoSettings }> {
  try {
    let logoUrl: string | null = null;
    let watermarkOpacity: number = 0.06;

    // 1. Query GeneralSettings table from database
    try {
      const record = await db.generalSettings.findFirst({
        where: { id: "default" },
      });
      if (record) {
        if (record.companyLogo !== undefined && record.companyLogo !== null) {
          logoUrl = record.companyLogo;
        }
        if (record.watermarkOpacity !== null && record.watermarkOpacity !== undefined) {
          const parsed = Number(record.watermarkOpacity);
          if (!isNaN(parsed) && parsed > 0) {
            watermarkOpacity = parsed;
          }
        }
      }
    } catch (e: any) {
      console.warn("Could not query GeneralSettings directly:", e.message);
    }

    return {
      success: true,
      data: {
        logoUrl,
        watermarkOpacity,
      },
    };
  } catch (err: any) {
    console.error("Error in getSiteLogoSettings:", err.message);
    return {
      success: true,
      data: {
        logoUrl: null,
        watermarkOpacity: 0.06,
      },
    };
  }
}

// Backward-compatible alias
export async function getGeneralSettings() {
  const res = await getSiteLogoSettings();
  return {
    success: true,
    data: {
      id: "default",
      companyName: "TripPlanner",
      companyLogo: res.data.logoUrl || "/brand-logo.png",
      watermarkOpacity: res.data.watermarkOpacity,
    },
  };
}

export async function updateSiteLogoSettings(data: {
  logoUrl: string | null;
  watermarkOpacity?: number;
}): Promise<{ success: boolean; error?: string; data?: SiteLogoSettings }> {
  try {
    const opacity = data.watermarkOpacity !== undefined ? Number(data.watermarkOpacity) : 0.06;

    // 1. Persist to GeneralSettings using native Prisma upsert
    try {
      await db.generalSettings.upsert({
        where: { id: "default" },
        update: {
          companyLogo: data.logoUrl,
          watermarkOpacity: opacity,
        },
        create: {
          id: "default",
          companyName: "TripPlanner",
          companyLogo: data.logoUrl,
          watermarkOpacity: opacity,
        },
      });
    } catch (e: any) {
      console.error("Could not upsert into GeneralSettings:", e.message);
      throw new Error("Failed to save settings to database");
    }

    // 2. Clean up any legacy settings labels from MasterBannerImage so Banner Images remains pristine
    if (db.masterBannerImage) {
      try {
        await db.masterBannerImage.deleteMany({
          where: { label: { in: ["SITE_LOGO", "SITE_WATERMARK_OPACITY"] } },
        });
      } catch (cleanupErr) {
        // Ignore if already clean
      }
    }

    revalidatePath("/");
    revalidatePath("/master-data");
    return {
      success: true,
      data: {
        logoUrl: data.logoUrl,
        watermarkOpacity: opacity,
      },
    };
  } catch (err: any) {
    console.error("Error updating site logo settings:", err);
    return { success: false, error: err.message || "Failed to save logo settings" };
  }
}

// Backward-compatible alias
export async function updateGeneralSettings(data: {
  companyLogo?: string | null;
  logoUrl?: string | null;
  watermarkOpacity?: number;
}) {
  const logo = data.companyLogo !== undefined ? data.companyLogo : data.logoUrl || null;
  return updateSiteLogoSettings({
    logoUrl: logo,
    watermarkOpacity: data.watermarkOpacity,
  });
}

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
      const rows: any = await db.$queryRawUnsafe(
        `SELECT "companyLogo", "watermarkOpacity" FROM "GeneralSettings" WHERE id = 'default' LIMIT 1;`
      );
      if (rows && rows.length > 0) {
        if (rows[0].companyLogo !== undefined && rows[0].companyLogo !== null) {
          logoUrl = rows[0].companyLogo;
        }
        if (rows[0].watermarkOpacity !== null && rows[0].watermarkOpacity !== undefined) {
          const parsed = Number(rows[0].watermarkOpacity);
          if (!isNaN(parsed) && parsed > 0) {
            watermarkOpacity = parsed;
          }
        }
      }
    } catch (e) {
      console.warn("Could not query GeneralSettings table directly:", e);
    }

    return {
      success: true,
      data: {
        logoUrl,
        watermarkOpacity,
      },
    };
  } catch (err: any) {
    console.error("Error in getSiteLogoSettings:", err);
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

    // 1. Persist exclusively to GeneralSettings table in PostgreSQL
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "GeneralSettings" (
          "id" TEXT PRIMARY KEY,
          "companyName" TEXT DEFAULT 'TripPlanner',
          "companyLogo" TEXT,
          "watermarkOpacity" DOUBLE PRECISION DEFAULT 0.06,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.$executeRawUnsafe(
        `
        INSERT INTO "GeneralSettings" ("id", "companyLogo", "watermarkOpacity", "updatedAt")
        VALUES ('default', $1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO UPDATE SET "companyLogo" = $1, "watermarkOpacity" = $2, "updatedAt" = CURRENT_TIMESTAMP;
      `,
        data.logoUrl,
        opacity
      );
    } catch (e) {
      console.error("Could not upsert into GeneralSettings table:", e);
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

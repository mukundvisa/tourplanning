"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface SiteLogoSettings {
  logoUrl: string | null;
  watermarkOpacity: number;
}

export async function getSiteLogoSettings(): Promise<{ success: boolean; data: SiteLogoSettings }> {
  try {
    // 1. Try querying MasterBannerImage for SITE_LOGO (safely available in Prisma model)
    if (db.masterBannerImage) {
      const bannerLogo = await db.masterBannerImage.findFirst({
        where: { label: "SITE_LOGO" },
      });
      if (bannerLogo?.imageUrl) {
        return {
          success: true,
          data: {
            logoUrl: bannerLogo.imageUrl,
            watermarkOpacity: 0.06,
          },
        };
      }
    }

    // 2. Try raw query on GeneralSettings table if it exists
    try {
      const rows: any = await db.$queryRawUnsafe(
        `SELECT "companyLogo", "watermarkOpacity" FROM "GeneralSettings" WHERE id = 'default' LIMIT 1;`
      );
      if (rows && rows.length > 0) {
        return {
          success: true,
          data: {
            logoUrl: rows[0].companyLogo || null,
            watermarkOpacity:
              rows[0].watermarkOpacity !== null ? Number(rows[0].watermarkOpacity) : 0.06,
          },
        };
      }
    } catch (e) {
      // GeneralSettings table not created or not queried
    }

    return {
      success: true,
      data: {
        logoUrl: null,
        watermarkOpacity: 0.06,
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
      companyName: "TripCraft",
      companyLogo: res.data.logoUrl,
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

    // 1. Save to masterBannerImage with label "SITE_LOGO"
    if (db.masterBannerImage) {
      const existing = await db.masterBannerImage.findFirst({
        where: { label: "SITE_LOGO" },
      });
      if (existing) {
        if (data.logoUrl) {
          await db.masterBannerImage.update({
            where: { id: existing.id },
            data: { imageUrl: data.logoUrl },
          });
        } else {
          await db.masterBannerImage.delete({ where: { id: existing.id } });
        }
      } else if (data.logoUrl) {
        await db.masterBannerImage.create({
          data: {
            label: "SITE_LOGO",
            imageUrl: data.logoUrl,
          },
        });
      }
    }

    // 2. Also persist to GeneralSettings table if possible
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "GeneralSettings" (
          "id" TEXT PRIMARY KEY,
          "companyName" TEXT DEFAULT 'TripCraft',
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
      console.warn("Could not upsert into GeneralSettings table via raw SQL:", e);
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

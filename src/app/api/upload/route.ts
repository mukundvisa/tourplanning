import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";
    const base64Data = buffer.toString("base64");
    const id = randomUUID();
    const cleanName = file.name.replace(/\s+/g, "-");

    // 1. Store directly into PostgreSQL StorageFile table
    try {
      await db.$executeRawUnsafe(
        `
        INSERT INTO "StorageFile" ("id", "filename", "mimeType", "dataBase64", "fileSize", "createdAt")
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO NOTHING;
      `,
        id,
        cleanName,
        mimeType,
        base64Data,
        buffer.length
      );
    } catch (dbErr) {
      console.warn("Could not insert into StorageFile table via raw SQL:", dbErr);
    }

    // 2. Return the direct DB storage URL as primary, and base64 Data URI
    // For small/medium images (e.g. logos, avatars, thumbnails), base64 data URIs are 100% self-contained
    const dbStorageUrl = `/api/storage/${id}`;
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      url: dbStorageUrl,
      dataUri: dataUri,
      id: id,
    });
  } catch (error: any) {
    console.error("Error in database upload API:", error);
    return NextResponse.json(
      { error: "Upload failed: " + error.message },
      { status: 500 }
    );
  }
}

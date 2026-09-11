import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Query StorageFile table
    try {
      const file = await db.storageFile.findUnique({
        where: { id },
      });
      if (file) {
        const buffer = Buffer.from(file.dataBase64, "base64");
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": file.mimeType || "image/jpeg",
            "Content-Disposition": `inline; filename="${file.filename}"`,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (e: any) {
      console.warn("StorageFile query failed:", e.message);
    }

    return new NextResponse("File Not Found", { status: 404 });
  } catch (error: any) {
    console.error("Storage retrieve error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

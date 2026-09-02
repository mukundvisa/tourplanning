import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Try querying StorageFile table
    try {
      const rows: any = await db.$queryRawUnsafe(
        `SELECT "filename", "mimeType", "dataBase64" FROM "StorageFile" WHERE id = $1 LIMIT 1;`,
        id
      );
      if (rows && rows.length > 0) {
        const file = rows[0];
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
    } catch (e) {
      console.warn("StorageFile query failed:", e);
    }

    return new NextResponse("File Not Found", { status: 404 });
  } catch (error: any) {
    console.error("Storage retrieve error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

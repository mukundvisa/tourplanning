import { NextRequest, NextResponse } from "next/server";
import { renderPdfHtml } from "@/lib/render-pdf-html";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const autoPrint = url.searchParams.get("print") === "1" || url.searchParams.get("print") === "true";

    const result = await renderPdfHtml(id, autoPrint);
    if (!result) {
      return new NextResponse("Trip Not Found", { status: 404 });
    }

    return new NextResponse(result.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error rendering HTML proposal:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

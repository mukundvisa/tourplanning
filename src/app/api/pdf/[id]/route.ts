/**
 * ==============================================================================
 * CONFIDENTIALITY & INTEGRITY WARNING:
 * ------------------------------------------------------------------------------
 * This PDF generation route is strictly for customer-facing travel proposals.
 * UNDER NO CIRCUMSTANCES should Admin Cost Calculation models (e.g. MasterCostRate,
 * TripCostCalculation, wholesale B2B internal costs, net profit, or margin percentages)
 * ever be queried, included, or referenced in this document generator.
 * ==============================================================================
 */

import { NextRequest } from "next/server";
import { renderPdfHtml } from "@/lib/render-pdf-html";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { existsSync } from "fs";
import { join } from "path";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const rendered = await renderPdfHtml(id, false);
    if (!rendered) {
      return new Response("Trip Not Found", { status: 404 });
    }

    const { html: htmlContent, title: rawTitle } = rendered;

    // Launch Puppeteer (Local Dev & Vercel Serverless Safe)
    let browser;
    try {
      let options: any = {};

      if (
        process.env.NODE_ENV === "development" ||
        process.env.IS_LOCAL === "true" ||
        process.platform === "win32"
      ) {
        options = {
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
          executablePath:
            process.env.CHROME_PATH ||
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          headless: true,
        };
      } else {
        const CHROMIUM_TAR_URL =
          "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

        let execPath = process.env.CHROMIUM_EXECUTABLE_PATH || "";

        if (!execPath && existsSync("/tmp/chromium")) {
          execPath = "/tmp/chromium";
        }

        if (!execPath) {
          const possibleBinPaths = [
            join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin"),
            "/var/task/node_modules/@sparticuz/chromium/bin",
          ];
          const localBin = possibleBinPaths.find((p) => existsSync(p));
          if (localBin) {
            try {
              execPath = await chromium.executablePath(localBin);
            } catch (localErr) {
              console.warn("Local bin extraction failed, will use remote pack URL:", localErr);
            }
          }
        }

        if (!execPath) {
          try {
            execPath = await chromium.executablePath(CHROMIUM_TAR_URL);
          } catch (tarErr) {
            console.warn("Primary tar pack URL failed, trying secondary:", tarErr);
            execPath = await chromium.executablePath(
              "https://github.com/Sparticuz/chromium/releases/download/v126.0.0/chromium-v126.0.0-pack.tar"
            );
          }
        }

        options = {
          args: [
            ...(chromium as any).args,
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--single-process",
            "--no-zygote",
          ],
          defaultViewport: (chromium as any).defaultViewport,
          executablePath: execPath,
          headless: (chromium as any).headless,
        };
      }
      browser = await puppeteer.launch(options);
    } catch (err: any) {
      console.error("Puppeteer launch error on server:", err);
      // Return 500 so client-side universal PDF engine seamlessly triggers
      return new Response(`PDF Serverless Launch Unavailable: ${err.message}`, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: "networkidle0" as any });

    // Export A4 PDF with guaranteed top margins (18mm) and repeating header/footer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 8px; color: #9CA3AF; width: 100%; padding: 0 6mm; display: flex; justify-content: space-between; font-family: sans-serif; font-weight: 600;">
          <span style="color: #14213D; font-weight: 700; letter-spacing: 0.05em;">TripPlanner</span>
          <span style="color: #6B7280;">${rawTitle}</span>
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 7.5px; color: #9CA3AF; width: 100%; padding: 0 6mm; display: flex; justify-content: space-between; font-family: sans-serif;">
          <span>Confidential Travel Itinerary Proposal</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: "18mm",
        bottom: "14mm",
        left: "6mm",
        right: "6mm",
      },
    });

    await browser.close();

    const safeFilename = `Itinerary-${rawTitle.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "-")}.pdf`;
    const encodedFilename = encodeURIComponent(safeFilename);

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "default-src 'self'",
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(`PDF Generation Error: ${error.message || error}`, {
      status: 500,
    });
  }
}

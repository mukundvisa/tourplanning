import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Universal High-Fidelity PDF Direct Download Utility
 * 
 * Generates an actual .pdf file and triggers a direct file download:
 * 1. Tries direct server-side PDF binary stream from /api/pdf/[tripId].
 * 2. If serverless Chromium is restricted on Vercel, compiles the HTML proposal into
 *    a multi-page A4 PDF using jsPDF + html2canvas directly in the client and downloads the file.
 * 
 * ZERO window.print() or print dialogs involved.
 */
export async function downloadTripPdf(tripId: string, title?: string): Promise<void> {
  const sanitizedTitle = (title || "Itinerary").replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "-");
  const filename = `Itinerary-${sanitizedTitle || "Trip"}.pdf`;

  // 1. First attempt: Direct server-side streaming PDF
  try {
    const res = await fetch(`/api/pdf/${tripId}`, {
      method: "GET",
      headers: {
        Accept: "application/pdf",
      },
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/pdf")) {
        const blob = await res.blob();
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const objectUrl = window.URL.createObjectURL(pdfBlob);

        const downloadAnchor = document.createElement("a");
        downloadAnchor.style.display = "none";
        downloadAnchor.href = objectUrl;
        downloadAnchor.download = filename;
        downloadAnchor.rel = "noopener noreferrer";

        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();

        setTimeout(() => {
          downloadAnchor.remove();
          window.URL.revokeObjectURL(objectUrl);
        }, 1000);
        return;
      }
    }
  } catch (err) {
    console.warn("Server PDF route returned non-200, generating client-side PDF document:", err);
  }

  // 2. Client-side PDF Generation Fallback (Direct file download, ZERO window.print)
  const htmlRes = await fetch(`/api/pdf/html/${tripId}?print=0`);
  if (!htmlRes.ok) {
    throw new Error("Could not retrieve proposal document.");
  }
  const htmlString = await htmlRes.text();

  // Create isolated iframe so modern parent Tailwind oklab styles do not interfere
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "794px"; // A4 width at 96 DPI
  iframe.style.height = "1123px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Could not initialize PDF renderer.");

    // Clean HTML from any window.print triggers and replace modern oklab/oklch with standard hex/rgb
    const cleanHtml = htmlString
      .replace(/<script[\s\S]*?window\.print[\s\S]*?<\/script>/gi, "")
      .replace(/onload="window\.print\(\)"/gi, "")
      .replace(/oklab\([^)]+\)/gi, "#14213d")
      .replace(/oklch\([^)]+\)/gi, "#b8944f");

    iframeDoc.open();
    iframeDoc.write(cleanHtml);
    iframeDoc.close();

    // Wait for iframe fonts to settle
    if (iframeDoc.fonts) {
      try {
        await iframeDoc.fonts.ready;
      } catch (e) {
        // ignore font ready error
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const images = Array.from(iframeDoc.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) resolve(true);
            else {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
            }
          })
      )
    );

    const targetElement = iframeDoc.body || iframeDoc.documentElement;

    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 794,
      onclone: (clonedDoc) => {
        // Inject styles to guarantee space retention and color compatibility
        const style = clonedDoc.createElement("style");
        style.innerHTML = `
          *, *::before, *::after {
            letter-spacing: normal !important;
            word-spacing: normal !important;
          }
        `;
        clonedDoc.head.appendChild(style);

        // Sanitize any remaining oklab/oklch in stylesheets or inline styles
        const allElements = clonedDoc.querySelectorAll("*");
        allElements.forEach((el: any) => {
          if (el.style) {
            const styleText = el.getAttribute("style") || "";
            if (styleText.includes("oklab") || styleText.includes("oklch")) {
              el.setAttribute(
                "style",
                styleText
                  .replace(/oklab\([^)]+\)/gi, "#14213d")
                  .replace(/oklch\([^)]+\)/gi, "#b8944f")
              );
            }
          }
        });
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

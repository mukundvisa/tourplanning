/**
 * Secure PDF Download Utility
 * Fetches the generated PDF and initiates a direct, secure client-side download
 * without opening insecure URLs or triggering browser mixed-content warnings.
 */
export async function downloadTripPdf(tripId: string, title?: string): Promise<void> {
  const sanitizedTitle = (title || "Itinerary").replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "-");
  const filename = `Itinerary-${sanitizedTitle || "Trip"}.pdf`;

  const res = await fetch(`/api/pdf/${tripId}`, {
    method: "GET",
    headers: {
      "Accept": "application/pdf",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `PDF generation failed (Status ${res.status})`);
  }

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

  // Clean up DOM and revoke blob URL after download starts
  setTimeout(() => {
    downloadAnchor.remove();
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);
}

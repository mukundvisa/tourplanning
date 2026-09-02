"use client";

import React, { useState } from "react";
import {
  Upload,
  Save,
  Check,
  Sliders,
  Trash2,
  Eye,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { updateSiteLogoSettings } from "@/actions/settings";

interface GeneralSettingsTabProps {
  initialSettings?: {
    companyLogo?: string | null;
    logoUrl?: string | null;
    watermarkOpacity?: number;
  };
}

export function GeneralSettingsTab({ initialSettings }: GeneralSettingsTabProps) {
  const initialLogo = initialSettings?.companyLogo || initialSettings?.logoUrl || null;
  const initialOpacity =
    initialSettings?.watermarkOpacity !== undefined ? initialSettings.watermarkOpacity : 0.06;

  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(initialOpacity);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Please upload an image smaller than 4MB.");
      return;
    }

    setUploadingLogo(true);
    setErrorMessage(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload image file");
      }

      const json = await res.json();
      if (json.url) {
        setLogoUrl(json.url);
      } else {
        throw new Error("Invalid upload response");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      // Fallback: Read as base64 Data URL directly
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setLogoUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await updateSiteLogoSettings({
        logoUrl,
        watermarkOpacity,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setErrorMessage(res.error || "Failed to update settings.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Logo & Watermark Settings Saved!</p>
              <p className="text-xs text-emerald-600">
                The updated site logo will now automatically be used as the light watermark across newly generated PDF proposals.
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Site Logo Upload & Opacity */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-4 w-4 text-[#B8944F]" />
                <h2 className="text-sm font-bold text-[#14213D] uppercase tracking-wide">
                  Site Logo & PDF Watermark
                </h2>
              </div>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl(null)}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>

            {/* Logo Upload Area */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-xl p-6 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-all relative group">
              {logoUrl ? (
                <div className="flex flex-col items-center space-y-3 py-2">
                  <div className="h-28 w-48 relative flex items-center justify-center p-2 bg-white rounded-lg border border-zinc-200 shadow-2xs overflow-hidden">
                    <img
                      src={logoUrl}
                      alt="Site Logo Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <label className="text-xs font-bold text-[#B8944F] hover:text-[#9A7B3E] cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Change Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer py-4 space-y-2 text-center w-full">
                  <div className="h-12 w-12 rounded-full bg-[#B8944F]/10 flex items-center justify-center text-[#B8944F] group-hover:scale-110 transition-transform">
                    {uploadingLogo ? (
                      <Loader2 className="h-6 w-6 animate-spin text-[#B8944F]" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-[#14213D]">
                    {uploadingLogo ? "Uploading Logo..." : "Click to upload site logo"}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    PNG, SVG, JPG, or WebP (Transparent background recommended)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Watermark Opacity Slider */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#14213D] flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-[#B8944F]" />
                  <span>PDF Watermark Opacity</span>
                </label>
                <span className="text-xs font-mono font-bold text-[#B8944F] bg-[#B8944F]/10 px-2 py-0.5 rounded">
                  {Math.round(watermarkOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.20"
                step="0.01"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#B8944F] cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500 leading-tight">
                Controls how lightly the watermark appears behind text on PDF proposals.
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#14213D] hover:bg-[#2B2E36] text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#B8944F]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 text-[#B8944F]" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Watermark Preview */}
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <span className="text-xs font-bold text-[#14213D] flex items-center gap-1.5 uppercase tracking-wide">
                <Eye className="h-3.5 w-3.5 text-[#B8944F]" />
                <span>PDF Watermark Live Preview</span>
              </span>
              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                A4 Preview
              </span>
            </div>

            <div className="border border-zinc-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-inner flex-1 min-h-[220px] flex flex-col justify-between">
              {/* Background Watermark */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
                style={{ opacity: watermarkOpacity }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Watermark Simulation"
                    className="max-h-32 max-w-[65%] object-contain filter grayscale"
                  />
                ) : (
                  <span className="text-3xl font-black text-zinc-900 tracking-wider font-serif uppercase transform -rotate-12">
                    TripCraft
                  </span>
                )}
              </div>

              {/* Sample Itinerary Content on top to show readability */}
              <div className="relative z-10 space-y-2 text-left">
                <div className="flex justify-between items-center border-b border-zinc-200/80 pb-1.5">
                  <span className="text-[10px] font-bold text-[#B8944F] uppercase tracking-wider">
                    Day 1 • Arrival & Welcome Tour
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400">Duration: 6h</span>
                </div>
                <h4 className="text-xs font-bold text-[#14213D]">
                  Curated Itinerary Experience & Luxury Stays
                </h4>
                <p className="text-[10px] text-zinc-600 leading-relaxed">
                  The watermark appears softly behind all itinerary cards and text, ensuring 100% crisp readability for clients.
                </p>
              </div>

              <div className="relative z-10 pt-2 border-t border-zinc-200/80 flex justify-between items-center text-[9px] text-zinc-400">
                <span>Page 1 • Official Quotation</span>
                <span className="font-semibold text-[#14213D]">TripCraft</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 italic text-center">
              The same logo uploaded on the left is automatically rendered as the watermark in newly generated PDFs.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

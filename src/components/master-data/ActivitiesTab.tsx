"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, Compass, Clock, MapPin, X, Loader2, Heart, AlertTriangle } from "lucide-react";
import {
  createMasterActivity,
  updateMasterActivity,
  deleteMasterActivity,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "../RichTextEditor";

interface ActivityItem {
  id: string;
  title: string;
  suggestedCityId: string | null;
  suggestedCity?: { id: string; name: string; country: string } | null;
  defaultDurationHours: string | null;
  description: string;
  inclusions: string[];
  exclusions: string[];
  loveTips: string[];
  watchOutTips: string[];
  titleTemplateId: string | null;
}

interface CityOption {
  id: string;
  name: string;
  country: string;
}

interface TitleTemplateItem {
  id: string;
  title: string;
}

export function ActivitiesTab({
  initialData,
  cities,
  titleTemplates,
}: {
  initialData: ActivityItem[];
  cities: CityOption[];
  titleTemplates: TitleTemplateItem[];
}) {
  const router = useRouter();
  const [data, setData] = useState<ActivityItem[]>(initialData);
  const [selectedTitleId, setSelectedTitleId] = useState<string>(() => {
    return titleTemplates[0]?.id || "";
  });
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ActivityItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    suggestedCityId: "",
    defaultDurationHours: "4",
    description: "",
    inclusions: [] as string[],
    exclusions: [] as string[],
    loveTips: [] as string[],
    watchOutTips: [] as string[],
    titleTemplateId: "",
  });

  // Tag inputs
  const [incInput, setIncInput] = useState("");
  const [excInput, setExcInput] = useState("");
  const [loveInput, setLoveInput] = useState("");
  const [watchInput, setWatchInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredByTemplate = data.filter((a) => a.titleTemplateId === selectedTitleId);
  const filtered = filteredByTemplate.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      (a.suggestedCity && a.suggestedCity.name.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => {
    if (!selectedTitleId) {
      alert("Please select a Title Template first.");
      return;
    }
    setEditingItem(null);
    setFormData({
      title: "",
      suggestedCityId: cities[0]?.id || "",
      defaultDurationHours: "4",
      description: "",
      inclusions: [],
      exclusions: [],
      loveTips: [],
      watchOutTips: [],
      titleTemplateId: selectedTitleId,
    });
    setModalOpen(true);
  };

  const openEdit = (item: ActivityItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      suggestedCityId: item.suggestedCityId || "",
      defaultDurationHours: item.defaultDurationHours?.toString() || "4",
      description: item.description,
      inclusions: item.inclusions || [],
      exclusions: item.exclusions || [],
      loveTips: item.loveTips || [],
      watchOutTips: item.watchOutTips || [],
      titleTemplateId: item.titleTemplateId || selectedTitleId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.titleTemplateId) return;
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        suggestedCityId: formData.suggestedCityId || undefined,
        defaultDurationHours: formData.defaultDurationHours || undefined,
        description: formData.description,
        inclusions: formData.inclusions,
        exclusions: formData.exclusions,
        loveTips: formData.loveTips,
        watchOutTips: formData.watchOutTips,
        titleTemplateId: formData.titleTemplateId,
      };

      if (editingItem) {
        const res = await updateMasterActivity(editingItem.id, payload);
        if (res.success && res.data) {
          const updated = {
            ...res.data,
            suggestedCity: cities.find((c) => c.id === res.data!.suggestedCityId) || null,
          } as ActivityItem;
          setData((prev) => prev.map((a) => (a.id === editingItem.id ? updated : a)));
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update activity");
        }
      } else {
        const res = await createMasterActivity(payload);
        if (res.success && res.data) {
          const created = {
            ...res.data,
            suggestedCity: cities.find((c) => c.id === res.data!.suggestedCityId) || null,
          } as ActivityItem;
          setData((prev) => [created, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create activity");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete activity "${title}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterActivity(id);
      if (res.success) {
        setData((prev) => prev.filter((a) => a.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete activity");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const selectedTemplate = titleTemplates.find((t) => t.id === selectedTitleId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#14213D] font-fraunces">
            Activity & Tour Library
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage sightseeing days and itineraries associated with proposal Title Templates.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedTitleId}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          <span>Add Master Activity</span>
        </button>
      </div>

      {/* Template Selection Dropdown */}
      <div className="bg-white border border-[#B8944F]/10 rounded-lg p-4 craft-card space-y-3">
        <label className="block text-xs font-bold text-zinc-700">
          Select Title Template to Configure Activities:
        </label>
        <select
          value={selectedTitleId}
          onChange={(e) => setSelectedTitleId(e.target.value)}
          className="w-full max-w-md px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-[#14213D] focus:bg-white focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none cursor-pointer"
        >
          <option value="">-- Choose a Title Template --</option>
          {titleTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        {selectedTemplate && (
          <p className="text-[11px] text-zinc-500 font-semibold flex items-center mt-1">
            <Compass className="h-3.5 w-3.5 text-[#B8944F] mr-1" />
            Configuring activities for: <span className="text-[#14213D] ml-1">"{selectedTemplate.title}"</span>
          </p>
        )}
      </div>

      {selectedTitleId ? (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search activities by title, location, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
                No activities found configured for this template.
              </div>
            ) : (
          filtered.map((act) => (
            <div
              key={act.id}
              className="bg-white border border-[#B8944F]/20 rounded-lg p-5 craft-card flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-[#14213D] line-clamp-1">
                    {act.title}
                  </h3>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => openEdit(act)}
                      className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(act.id, act.title)}
                      disabled={deletingId === act.id}
                      className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 cursor-pointer"
                    >
                      {deletingId === act.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-zinc-500 mb-3">
                  {act.suggestedCity && (
                    <span className="flex items-center font-semibold text-[#B8944F]">
                      <MapPin className="h-3 w-3 mr-1" />
                      {act.suggestedCity.name}, {act.suggestedCity.country}
                    </span>
                  )}
                  {act.defaultDurationHours && (
                    <span className="flex items-center font-mono">
                      <Clock className="h-3 w-3 mr-1 text-zinc-400" />
                      {act.defaultDurationHours.toLowerCase().includes("hour") || act.defaultDurationHours.toLowerCase().includes("day")
                        ? act.defaultDurationHours
                        : `${act.defaultDurationHours} Hours`}
                    </span>
                  )}
                </div>

                <div 
                  className="text-xs text-zinc-600 line-clamp-3 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: act.description }}
                />

                {/* Inclusions & Tips preview */}
                <div className="space-y-1.5 pt-3 border-t border-zinc-100 text-[11px]">
                  {act.inclusions && act.inclusions.length > 0 && (
                    <div className="text-zinc-600">
                      <span className="font-semibold text-[#14213D]">Inclusions: </span>
                      {act.inclusions.slice(0, 3).join(" • ")}
                      {act.inclusions.length > 3 && ` +${act.inclusions.length - 3} more`}
                    </div>
                  )}
                  {act.loveTips && act.loveTips.length > 0 && (
                    <div className="text-pink-700 flex items-center">
                      <Heart className="h-3 w-3 mr-1 shrink-0 inline text-pink-500" />
                      <span className="truncate">{act.loveTips[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  ) : (
    <div className="py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
      Please select a Title Template from the dropdown above to manage its activities.
    </div>
  )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-2xl w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Activity Library Item" : "Create Master Activity"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Activity Day Theme / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Uluwatu Sunset Temple & Kecak Fire Dance"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Associate with Title Template *
                  </label>
                  <select
                    required
                    value={formData.titleTemplateId}
                    onChange={(e) =>
                      setFormData({ ...formData, titleTemplateId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white cursor-pointer"
                  >
                    <option value="">-- Choose a Title Template --</option>
                    {titleTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Suggested Destination City
                  </label>
                  <select
                    value={formData.suggestedCityId}
                    onChange={(e) =>
                      setFormData({ ...formData, suggestedCityId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white"
                  >
                    <option value="">-- Any City / Universal --</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Default Duration (e.g. 4 Hours, Half Day, Full Day)
                  </label>
                  <input
                    type="text"
                    value={formData.defaultDurationHours}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultDurationHours: e.target.value })
                    }
                    placeholder="e.g. 4 Hours, Half Day"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Day Narrative Description *
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(val) => setFormData({ ...formData, description: val })}
                  placeholder="Detailed chronological plan of activities..."
                />
              </div>

              {/* Inclusions & Exclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Inclusions
                  </label>
                  <div className="flex gap-1 mb-2">
                    <input
                      type="text"
                      value={incInput}
                      onChange={(e) => setIncInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (incInput.trim()) {
                            setFormData({
                              ...formData,
                              inclusions: [...formData.inclusions, incInput.trim()],
                            });
                            setIncInput("");
                          }
                        }
                      }}
                      placeholder="Type & press Enter..."
                      className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (incInput.trim()) {
                          setFormData({
                            ...formData,
                            inclusions: [...formData.inclusions, incInput.trim()],
                          });
                          setIncInput("");
                        }
                      }}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.inclusions.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              inclusions: formData.inclusions.filter((_, i) => i !== idx),
                            })
                          }
                          className="ml-1 text-emerald-600 hover:text-emerald-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Exclusions
                  </label>
                  <div className="flex gap-1 mb-2">
                    <input
                      type="text"
                      value={excInput}
                      onChange={(e) => setExcInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (excInput.trim()) {
                            setFormData({
                              ...formData,
                              exclusions: [...formData.exclusions, excInput.trim()],
                            });
                            setExcInput("");
                          }
                        }
                      }}
                      placeholder="Type & press Enter..."
                      className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (excInput.trim()) {
                          setFormData({
                            ...formData,
                            exclusions: [...formData.exclusions, excInput.trim()],
                          });
                          setExcInput("");
                        }
                      }}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.exclusions.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              exclusions: formData.exclusions.filter((_, i) => i !== idx),
                            })
                          }
                          className="ml-1 text-red-600 hover:text-red-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loved Tips & Watch-out Tips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ❤️ What Travelers Love
                  </label>
                  <div className="flex gap-1 mb-2">
                    <input
                      type="text"
                      value={loveInput}
                      onChange={(e) => setLoveInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (loveInput.trim()) {
                            setFormData({
                              ...formData,
                              loveTips: [...formData.loveTips, loveInput.trim()],
                            });
                            setLoveInput("");
                          }
                        }
                      }}
                      placeholder="Pro insider tip..."
                      className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (loveInput.trim()) {
                          setFormData({
                            ...formData,
                            loveTips: [...formData.loveTips, loveInput.trim()],
                          });
                          setLoveInput("");
                        }
                      }}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.loveTips.map((tip, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-pink-50 text-pink-800 border border-pink-200"
                      >
                        {tip}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              loveTips: formData.loveTips.filter((_, i) => i !== idx),
                            })
                          }
                          className="ml-1 text-pink-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ⚠️ Watch-out Guidelines
                  </label>
                  <div className="flex gap-1 mb-2">
                    <input
                      type="text"
                      value={watchInput}
                      onChange={(e) => setWatchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (watchInput.trim()) {
                            setFormData({
                              ...formData,
                              watchOutTips: [...formData.watchOutTips, watchInput.trim()],
                            });
                            setWatchInput("");
                          }
                        }
                      }}
                      placeholder="Warning / advisory tip..."
                      className="flex-1 px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (watchInput.trim()) {
                          setFormData({
                            ...formData,
                            watchOutTips: [...formData.watchOutTips, watchInput.trim()],
                          });
                          setWatchInput("");
                        }
                      }}
                      className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.watchOutTips.map((tip, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                      >
                        {tip}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              watchOutTips: formData.watchOutTips.filter((_, i) => i !== idx),
                            })
                          }
                          className="ml-1 text-amber-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#B8944F] hover:bg-[#8F6F33] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                  {editingItem ? "Update Activity" : "Save Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Plus, Search, Edit2, Trash2, FileText, X, Loader2 } from "lucide-react";
import {
  createMasterPolicyTemplate,
  updateMasterPolicyTemplate,
  deleteMasterPolicyTemplate,
} from "@/actions/master-data";
import { useRouter } from "next/navigation";
import { RichTextEditor } from "../RichTextEditor";

interface PolicyTemplateItem {
  id: string;
  name: string;
  paymentPolicy: string;
  cancellationPolicy: string;
  visaRules: string;
  generalNotes: string;
  titleTemplateId: string | null;
}

interface TitleTemplateItem {
  id: string;
  title: string;
}

export function PolicyTemplatesTab({
  initialData,
  titleTemplates,
}: {
  initialData: PolicyTemplateItem[];
  titleTemplates: TitleTemplateItem[];
}) {
  const router = useRouter();
  const [data, setData] = useState<PolicyTemplateItem[]>(initialData);
  const [selectedTitleId, setSelectedTitleId] = useState<string>(() => {
    return titleTemplates[0]?.id || "";
  });
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PolicyTemplateItem | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    paymentPolicy: "",
    cancellationPolicy: "",
    visaRules: "",
    generalNotes: "",
    titleTemplateId: "",
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredByTemplate = data.filter((p) => p.titleTemplateId === selectedTitleId);
  const filtered = filteredByTemplate.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    if (!selectedTitleId) {
      alert("Please select a Title Template first.");
      return;
    }
    setEditingItem(null);
    setFormData({
      name: "",
      paymentPolicy: "<p><strong>Booking Deposit:</strong> 30% advance required upon reservation confirmation.</p><p><strong>Final Balance:</strong> Remaining 70% required 15 days prior to travel.</p>",
      cancellationPolicy: "<p>Free cancellation up to 30 days prior. 50% penalty between 29 to 15 days. 100% within 14 days.</p>",
      visaRules: "<p>Passport must hold 6 months validity from date of return.</p>",
      generalNotes: "<p>Standard hotel check-in 14:00 and check-out 11:00.</p>",
      titleTemplateId: selectedTitleId,
    });
    setModalOpen(true);
  };

  const openEdit = (item: PolicyTemplateItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      paymentPolicy: item.paymentPolicy,
      cancellationPolicy: item.cancellationPolicy,
      visaRules: item.visaRules,
      generalNotes: item.generalNotes,
      titleTemplateId: item.titleTemplateId || selectedTitleId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);
    try {
      if (editingItem) {
        const res = await updateMasterPolicyTemplate(editingItem.id, formData);
        if (res.success && res.data) {
          setData((prev) =>
            prev.map((p) => (p.id === editingItem.id ? res.data! : p))
          );
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to update policy template");
        }
      } else {
        const res = await createMasterPolicyTemplate(formData);
        if (res.success && res.data) {
          setData((prev) => [res.data!, ...prev]);
          setModalOpen(false);
          router.refresh();
        } else {
          alert(res.error || "Failed to create policy template");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete policy template "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteMasterPolicyTemplate(id);
      if (res.success) {
        setData((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      } else {
        alert(res.error || "Failed to delete policy template");
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
            Master Policy & Terms Templates
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pre-fills Payment, Cancellation, Visa rules, and General notes into Step 8 in a single click
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!selectedTitleId}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#B8944F] hover:bg-[#8F6F33] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          <span>Add Policy Template</span>
        </button>
      </div>

      {/* Template Selection Dropdown */}
      <div className="bg-white border border-[#B8944F]/10 rounded-lg p-4 craft-card space-y-3">
        <label className="block text-xs font-bold text-zinc-700">
          Select Title Template to Configure Policies:
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
            <FileText className="h-3.5 w-3.5 text-[#B8944F] mr-1" />
            Configuring policies for: <span className="text-[#14213D] ml-1">"{selectedTemplate.title}"</span>
          </p>
        )}
      </div>

      {selectedTitleId ? (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search policy presets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-zinc-400 text-xs bg-white border border-dashed rounded-lg">
                No policy templates found.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#B8944F]/20 rounded-lg p-5 craft-card flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-sm font-bold text-[#14213D] flex items-center">
                        <FileText className="h-4 w-4 text-[#B8944F] mr-2 shrink-0" />
                        {item.name}
                      </h3>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-[#B8944F] cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={deletingId === item.id}
                          className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 cursor-pointer"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-[11px] text-zinc-650 border-t border-zinc-100 pt-3">
                      <div>
                        <span className="font-semibold text-[#14213D]">1. Payment: </span>
                        <div
                          className="line-clamp-2 text-zinc-500 mt-0.5"
                          dangerouslySetInnerHTML={{ __html: item.paymentPolicy }}
                        />
                      </div>
                      <div>
                        <span className="font-semibold text-[#14213D]">2. Cancellation: </span>
                        <div
                          className="line-clamp-2 text-zinc-500 mt-0.5"
                          dangerouslySetInnerHTML={{ __html: item.cancellationPolicy }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-xl p-8 text-center text-zinc-400 text-xs font-medium">
          Please select a Title Template from the dropdown above to configure its associated Policies.
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl max-w-2xl w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4 sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-[#14213D] font-fraunces">
                {editingItem ? "Edit Policy Template" : "Add Policy Template"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Associated Title Template *
                </label>
                <select
                  required
                  value={formData.titleTemplateId}
                  onChange={(e) => setFormData({ ...formData, titleTemplateId: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none bg-white cursor-pointer"
                >
                  <option value="">-- Select Template --</option>
                  {titleTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Preset Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Standard International Luxury Travel Policy"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#B8944F] focus:border-[#B8944F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Payment Policy
                </label>
                <RichTextEditor
                  value={formData.paymentPolicy}
                  onChange={(val) =>
                    setFormData({ ...formData, paymentPolicy: val })
                  }
                  placeholder="Payment milestones, deposit requirements, and final balance details..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Cancellation Policy
                </label>
                <RichTextEditor
                  value={formData.cancellationPolicy}
                  onChange={(val) =>
                    setFormData({ ...formData, cancellationPolicy: val })
                  }
                  placeholder="Refund rules, cut-off dates, and cancellation charges..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Visa & Passport Rules
                </label>
                <RichTextEditor
                  value={formData.visaRules}
                  onChange={(val) =>
                    setFormData({ ...formData, visaRules: val })
                  }
                  placeholder="Passport validity, visa requirements, travel insurance mandates..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  General Notes & Advisory
                </label>
                <RichTextEditor
                  value={formData.generalNotes}
                  onChange={(val) =>
                    setFormData({ ...formData, generalNotes: val })
                  }
                  placeholder="Hotel check-in timings, luggage advisories, ground guidelines..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 sticky bottom-0 bg-white">
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
                  {editingItem ? "Update Template" : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

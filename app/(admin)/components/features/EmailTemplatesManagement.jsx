"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FaSave,
  FaEnvelope,
  FaChevronDown,
  FaChevronRight,
  FaInfoCircle,
  FaCode,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";

export default function EmailTemplatesManagement() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/email-templates");
        if (res.data?.success && Array.isArray(res.data.data)) {
          setTemplates(res.data.data);
          if (res.data.data.length > 0 && !expandedKey) {
            setExpandedKey(res.data.data[0].key);
          }
        }
      } catch (err) {
        if (mounted.current) {
          showError(err?.response?.data?.message || "Failed to load templates");
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    fetchTemplates();
    return () => { mounted.current = false; };
  }, []);

  const handleChange = (key, field, value) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.key === key ? { ...t, [field]: value } : t
      )
    );
  };

  const handleSave = async (key) => {
    const t = templates.find((x) => x.key === key);
    if (!t) return;
    setSavingKey(key);
    try {
      const res = await api.patch(`/admin/email-templates/${key}`, {
        subject: t.subject,
        bodyText: t.bodyText,
        bodyHtml: t.bodyHtml,
        isActive: t.isActive,
      });
      if (res.data?.success) {
        success(`"${t.name}" saved.`);
        setTemplates((prev) =>
          prev.map((x) =>
            x.key === key
              ? { ...x, updatedAt: res.data.data?.updatedAt || x.updatedAt }
              : x
          )
        );
      } else {
        showError(res.data?.message || "Save failed");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetToDefault = (key) => {
    if (!window.confirm("Clear custom content and use built-in default for this template?")) return;
    const t = templates.find((x) => x.key === key);
    if (!t) return;
    setTemplates((prev) =>
      prev.map((x) =>
        x.key === key ? { ...x, subject: "", bodyText: "", bodyHtml: "", isActive: true } : x
      )
    );
    setSavingKey(key);
    api
      .patch(`/admin/email-templates/${key}`, {
        subject: "",
        bodyText: "",
        bodyHtml: "",
        isActive: true,
      })
      .then((res) => {
        if (res.data?.success) {
          success(`"${t.name}" reset to default.`);
          setTemplates((prev) =>
            prev.map((x) =>
              x.key === key ? { ...x, updatedAt: res.data.data?.updatedAt || null } : x
            )
          );
        } else {
          showError(res.data?.message || "Reset failed");
        }
      })
      .catch((err) => showError(err?.response?.data?.message || "Reset failed"))
      .finally(() => setSavingKey(null));
  };

  const toggleExpanded = (key) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FaEnvelope className="text-indigo-600" />
              Email Templates
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage email content sent to users for each activity. Leave subject/body empty to use built-in defaults.
              Use placeholders like <code className="bg-gray-200 px-1 rounded text-xs">{`{{name}}`}</code> in the body; they are replaced when the email is sent.
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {templates.map((t) => (
              <div key={t.key} className="bg-white">
                <button
                  type="button"
                  onClick={() => toggleExpanded(t.key)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedKey === t.key ? (
                      <FaChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    ) : (
                      <FaChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                    )}
                    <span className="font-medium text-gray-900">{t.name}</span>
                    {!t.isActive && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                        Inactive (default used)
                      </span>
                    )}
                  </div>
                  {t.updatedAt && (
                    <span className="text-xs text-gray-500">
                      Updated {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </button>

                {expandedKey === t.key && (
                  <div className="px-6 pb-6 pt-0 border-t border-gray-100 bg-gray-50/50">
                    {t.description && (
                      <p className="text-sm text-gray-600 mt-3 mb-4">{t.description}</p>
                    )}
                    {t.placeholders?.length > 0 && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                        <FaInfoCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <span className="font-medium">Placeholders: </span>
                          <span className="font-mono text-xs">
                            {t.placeholders.join(", ")}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={t.subject}
                          onChange={(e) => handleChange(t.key, "subject", e.target.value)}
                          placeholder="e.g. We received your request"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                          <FaCode className="w-3.5 h-3.5 text-gray-500" />
                          Plain text body
                        </label>
                        <textarea
                          value={t.bodyText}
                          onChange={(e) => handleChange(t.key, "bodyText", e.target.value)}
                          placeholder="Leave empty to use default. Use {{placeholders}} for dynamic values."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          HTML body
                        </label>
                        <textarea
                          value={t.bodyHtml}
                          onChange={(e) => handleChange(t.key, "bodyHtml", e.target.value)}
                          placeholder="Optional. e.g. <p>Hello {{name}},</p><p>Thank you.</p>"
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.isActive}
                            onChange={(e) => handleChange(t.key, "isActive", e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">Use this template (when filled)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSave(t.key)}
                          disabled={savingKey === t.key}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {savingKey === t.key ? (
                            <LoadingSpinner size="small" color="white" />
                          ) : (
                            <FaSave className="w-4 h-4" />
                          )}
                          {savingKey === t.key ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetToDefault(t.key)}
                          disabled={savingKey === t.key}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                          Reset to default
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaSave, FaCode, FaInfoCircle } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";

const PLACEHOLDER_HEADER = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>`;

const PLACEHOLDER_FOOTER = `<!-- Optional: extra scripts before </body> -->`;

export default function SiteSettingsManagement() {
  const [headerCode, setHeaderCode] = useState("");
  const [footerCode, setFooterCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/site-settings/custom-code");
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          setHeaderCode(d.headerCode ?? "");
          setFooterCode(d.footerCode ?? "");
        }
      } catch (err) {
        if (mounted.current) setError(err?.response?.data?.message || "Failed to load settings");
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    fetchSettings();
    return () => { mounted.current = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch("/admin/site-settings", {
        headerCode: headerCode.trim(),
        footerCode: footerCode.trim(),
      });
      if (res.data?.success) {
        success("Site settings saved. Header and footer code will appear on the public site.");
      } else {
        showError(res.data?.message || "Save failed");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
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
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Site Settings</h1>
          <p className="text-sm text-gray-600">
            Add custom code (e.g. Google Analytics / GA4) to the <strong>header</strong> and <strong>footer</strong> of your public site.
            Header code is injected in <code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code>, footer code before <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code>.
          </p>
          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <FaInfoCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Google Analytics (GA4)</p>
              <p className="mt-1">
                In Google Analytics → Admin → Data Streams → your stream → View tag instructions → Install manually.
                Copy the full snippet (from <code className="bg-amber-100 px-1 rounded">&lt;!-- Google tag --&gt;</code> to <code className="bg-amber-100 px-1 rounded">&lt;/script&gt;</code>) and paste it into <strong>Header code</strong> below.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCode className="inline w-4 h-4 mr-1.5 text-indigo-600" />
                Header code
              </label>
              <textarea
                name="headerCode"
                value={headerCode}
                onChange={(e) => setHeaderCode(e.target.value)}
                placeholder={PLACEHOLDER_HEADER}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-gray-500">
                Injected in <code>&lt;head&gt;</code>. Use for Google tag (gtag.js), meta tags, or other head scripts.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCode className="inline w-4 h-4 mr-1.5 text-indigo-600" />
                Footer code
              </label>
              <textarea
                name="footerCode"
                value={footerCode}
                onChange={(e) => setFooterCode(e.target.value)}
                placeholder={PLACEHOLDER_FOOTER}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-gray-500">
                Injected before <code>&lt;/body&gt;</code>. Use for chat widgets, extra analytics, or other body scripts.
              </p>
            </div>
          </div>
          {error && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <LoadingSpinner size="small" color="white" /> : <FaSave className="w-4 h-4" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

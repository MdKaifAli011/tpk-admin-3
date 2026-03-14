"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FaSave, FaEnvelope, FaPaperPlane, FaInfoCircle, FaKey } from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";

const ENCRYPTION_OPTIONS = [
  { value: "ssl", label: "SSL" },
  { value: "tls", label: "TLS" },
  { value: "", label: "None" },
];

export default function EmailSettingsManagement() {
  const [form, setForm] = useState({
    mailMailer: "smtp",
    mailHost: "",
    mailPort: 465,
    mailUsername: "",
    mailPassword: "",
    mailEncryption: "ssl",
    mailFromAddress: "",
    mailFromName: "TestprepKart",
    leadExportMailTo: "",
  });
  const [mailPasswordMasked, setMailPasswordMasked] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/admin/email-settings");
        if (res.data?.success && res.data.data) {
          const d = res.data.data;
          setForm({
            mailMailer: d.mailMailer ?? "smtp",
            mailHost: d.mailHost ?? "",
            mailPort: d.mailPort ?? 465,
            mailUsername: d.mailUsername ?? "",
            mailPassword: "",
            mailEncryption: d.mailEncryption ?? "ssl",
            mailFromAddress: d.mailFromAddress ?? "",
            mailFromName: d.mailFromName ?? "TestprepKart",
            leadExportMailTo: d.leadExportMailTo ?? "",
          });
          setMailPasswordMasked(d.mailPasswordMasked ?? "");
        }
      } catch (err) {
        if (mounted.current) {
          setError(err?.response?.data?.message || "Failed to load email settings");
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    fetchSettings();
    return () => { mounted.current = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "mailPort") {
      setForm((prev) => ({ ...prev, [name]: parseInt(value, 10) || 465 }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.mailPassword) delete payload.mailPassword;
      const res = await api.patch("/admin/email-settings", payload);
      if (res.data?.success) {
        success("Email settings saved successfully.");
        if (res.data.data?.mailPasswordMasked) {
          setMailPasswordMasked(res.data.data.mailPasswordMasked);
        }
      } else {
        showError(res.data?.message || "Save failed");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setError(null);
    try {
      const res = await api.post("/admin/email-settings", { to: testTo.trim() || undefined });
      if (res.data?.success) {
        success(`Test email sent to ${res.data.data?.to || "From address"}.`);
      } else {
        showError(res.data?.message || "Send failed");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to send test email");
    } finally {
      setSendingTest(false);
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
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FaEnvelope className="text-indigo-600" />
              Email & Notifications
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure SMTP for sending emails and set notification recipients (e.g. lead export).
              Values saved here override <code className="bg-gray-200 px-1 rounded">.env</code>. If nothing is saved yet, the app uses .env (if set).
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <Link href="/admin/email-templates" className="text-indigo-600 hover:underline">
                Manage email templates by activity →
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* SMTP */}
            <section>
              <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <FaKey className="text-gray-500" />
                SMTP (Mail server)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                  <input
                    type="text"
                    name="mailHost"
                    value={form.mailHost}
                    onChange={handleChange}
                    placeholder="smtp.hostinger.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input
                    type="number"
                    name="mailPort"
                    value={form.mailPort}
                    onChange={handleChange}
                    min={1}
                    max={65535}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    name="mailUsername"
                    value={form.mailUsername}
                    onChange={handleChange}
                    placeholder="donot-reply@testprepkart.in"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    name="mailPassword"
                    value={form.mailPassword}
                    onChange={handleChange}
                    placeholder={mailPasswordMasked ? "Leave blank to keep current" : "SMTP password"}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {mailPasswordMasked && !form.mailPassword && (
                    <p className="text-xs text-gray-500 mt-1">Current password is set (shown as {mailPasswordMasked})</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
                  <select
                    name="mailEncryption"
                    value={form.mailEncryption}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {ENCRYPTION_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From address</label>
                  <input
                    type="email"
                    name="mailFromAddress"
                    value={form.mailFromAddress}
                    onChange={handleChange}
                    placeholder="donot-reply@testprepkart.in"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From name</label>
                  <input
                    type="text"
                    name="mailFromName"
                    value={form.mailFromName}
                    onChange={handleChange}
                    placeholder="TestprepKart"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section>
              <h2 className="text-lg font-medium text-gray-800 mb-4">Notification recipients</h2>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <div className="flex gap-2">
                  <FaInfoCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Lead export</p>
                    <p className="mt-1">
                      When admins export leads to CSV and choose &quot;Send email&quot;, the CSV is sent to this address.
                      You can add multiple emails separated by commas.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead export email (to)</label>
                <input
                  type="text"
                  name="leadExportMailTo"
                  value={form.leadExportMailTo}
                  onChange={handleChange}
                  placeholder="hellomdkaifali@gmail.com or email1@example.com, email2@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </section>

            {/* Test email */}
            <section className="pt-4 border-t border-gray-200">
              <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <FaPaperPlane className="text-gray-500" />
                Test email
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send test to (optional)</label>
                  <input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="Leave blank to use From address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {sendingTest ? <LoadingSpinner size="small" color="white" /> : <FaPaperPlane className="w-4 h-4" />}
                  {sendingTest ? "Sending…" : "Send test email"}
                </button>
              </div>
            </section>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <LoadingSpinner size="small" color="white" /> : <FaSave className="w-4 h-4" />}
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

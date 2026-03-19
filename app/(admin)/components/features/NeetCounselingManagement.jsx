"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FaFileExport,
  FaCloudUploadAlt,
  FaSpinner,
  FaCheckCircle,
  FaFileCsv,
  FaInfoCircle,
} from "react-icons/fa";
import api from "@/lib/api";
import { useToast, ToastContainer } from "../ui/Toast";
import { parseCSV } from "@/utils/csvParser";

const ROUNDS = ["1", "2", "3"];
const YEARS_PLACEHOLDER = ["2025", "2024", "2023"];

export default function NeetCounselingManagement() {
  const [exportRound, setExportRound] = useState("1");
  const [exportYear, setExportYear] = useState("2025");
  const [years, setYears] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [importRound, setImportRound] = useState("1");
  const [importYear, setImportYear] = useState("2025");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [previewRows, setPreviewRows] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const { toasts, removeToast, success, error: showError } = useToast();

  const fetchYears = useCallback(async () => {
    try {
      const res = await api.get("/neet-counseling/meta?round=1&year=2025");
      if (res.data?.success && Array.isArray(res.data.data?.years)) {
        setYears(res.data.data.years.length ? res.data.data.years : YEARS_PLACEHOLDER);
        if (res.data.data.years.length && !exportYear) {
          setExportYear(res.data.data.years[0]);
          setImportYear(res.data.data.years[0]);
        }
      } else {
        setYears(YEARS_PLACEHOLDER);
      }
    } catch (e) {
      setYears(YEARS_PLACEHOLDER);
    }
  }, []);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const yearOptions = years.length ? years : YEARS_PLACEHOLDER;

  const handleExport = async () => {
    setIsExporting(true);
    setLastResult(null);
    try {
      const params = new URLSearchParams({ round: exportRound, year: exportYear });
      const response = await api.get(`/admin/neet-counseling/export?${params.toString()}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `neet-counseling-round${exportRound}-${exportYear}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      success("Export completed. File downloaded.");
    } catch (err) {
      const msg = err.response?.data instanceof Blob
        ? "Export failed"
        : (err.response?.data?.message || err.message || "Export failed");
      showError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    setImportFile(file);
    setPreviewRows(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseCSV(reader.result);
        setPreviewRows(Array.isArray(data) ? data.slice(0, 20) : []);
      } catch {
        setPreviewRows(null);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!importFile) {
      showError("Please select a CSV file.");
      return;
    }
    setIsImporting(true);
    setLastResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("round", importRound);
      formData.append("year", importYear);
      formData.append("replace", replaceExisting ? "true" : "false");
      const res = await api.post("/admin/neet-counseling/import", formData);
      if (res.data?.success) {
        setLastResult(res.data.data);
        success(`Imported ${res.data.data?.imported ?? 0} rows${res.data.data?.replaced ? ` (replaced ${res.data.data.replaced} existing).` : "."}`);
        setImportFile(null);
        setPreviewRows(null);
        if (document.getElementById("neet-csv-input")) {
          document.getElementById("neet-csv-input").value = "";
        }
        fetchYears();
      } else {
        showError(res.data?.message || "Import failed.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Import failed.";
      showError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-full mx-auto p-4 space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header Section - matches other admin Import/Export pages */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              NEET Counseling Data
            </h1>
            <p className="text-xs text-gray-600">
              Export allotment data as CSV or import from CSV for a selected round and year. Use the same CSV format as the export for best results.
            </p>
          </div>
        </div>
      </div>

      {/* Export Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <FaFileExport className="size-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Export to CSV
          </h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Round
              </label>
              <select
                value={exportRound}
                onChange={(e) => setExportRound(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm outline-none"
              >
                {ROUNDS.map((r) => (
                  <option key={r} value={r}>Round {r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Year
              </label>
              <select
                value={exportYear}
                onChange={(e) => setExportYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <FaFileCsv className="w-4 h-4" />
                    Export to CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-green-100 rounded-lg text-green-600">
            <FaCloudUploadAlt className="size-4" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Import from CSV
          </h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Round
              </label>
              <select
                value={importRound}
                onChange={(e) => setImportRound(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm outline-none"
              >
                {ROUNDS.map((r) => (
                  <option key={r} value={r}>Round {r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Year
              </label>
              <select
                value={importYear}
                onChange={(e) => setImportYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                CSV file
              </label>
              <input
                id="neet-csv-input"
                type="file"
                accept=".csv"
                onChange={onFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 file:transition-colors"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-700 font-medium">
              Replace all data for this round and year (delete then insert). If unchecked, same serialNo is updated instead of duplicated.
            </span>
          </label>

          {previewRows && previewRows.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                Preview (first {previewRows.length} rows)
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-52 overflow-y-auto shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {Object.keys(previewRows[0]).slice(0, 8).map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">
                          {h}
                        </th>
                      ))}
                      {Object.keys(previewRows[0]).length > 8 && (
                        <th className="px-4 py-3 text-gray-500 border-b border-gray-200">…</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        {Object.keys(previewRows[0]).slice(0, 8).map((k) => (
                          <td key={k} className="px-4 py-2 text-gray-800 truncate max-w-[140px] align-top" title={row[k]}>
                            {row[k]}
                          </td>
                        ))}
                        {Object.keys(previewRows[0]).length > 8 && <td className="px-4 py-2 text-gray-400">…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleImport}
              disabled={!importFile || isImporting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <FaCloudUploadAlt className="w-4 h-4" />
                  Import CSV
                </>
              )}
            </button>
          </div>

          {lastResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
              <FaCheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div className="text-sm text-green-800 font-medium">
                <span>Imported: {lastResult.imported}</span>
                {lastResult.replaced > 0 && (
                  <span className="ml-1">· Replaced: {lastResult.replaced}</span>
                )}
                {lastResult.updated > 0 && (
                  <span className="ml-1">· Updated: {lastResult.updated}</span>
                )}
                {lastResult.inserted != null && lastResult.inserted !== lastResult.imported && lastResult.replaced === 0 && (
                  <span className="ml-1">· New: {lastResult.inserted}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help / Information Section - matches other admin pages */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FaInfoCircle className="text-blue-600 size-5" />
          <h3 className="text-sm font-bold text-gray-900">
            Round-specific CSV format
          </h3>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          Export and import use <strong className="text-gray-700">only the columns for the selected round</strong>. Round and Year in the form override values in the file when importing.
        </p>
        <ul className="text-sm text-gray-600 leading-relaxed mb-3 list-disc list-inside space-y-1">
          <li><strong className="text-gray-700">Round 1</strong>: Base columns + <strong className="text-gray-700">round1Quota</strong>, <strong className="text-gray-700">round1Institute</strong>, <strong className="text-gray-700">round1Course</strong>, <strong className="text-gray-700">round1Status</strong> only (no round 2 or 3 columns).</li>
          <li><strong className="text-gray-700">Round 2</strong>: Round 1 columns + <strong className="text-gray-700">round2Quota</strong>, <strong className="text-gray-700">round2Institute</strong>, <strong className="text-gray-700">round2Course</strong>, <strong className="text-gray-700">round2OptionNo</strong>, <strong className="text-gray-700">round2Outcome</strong>.</li>
          <li><strong className="text-gray-700">Round 3</strong>: Round 2 columns + <strong className="text-gray-700">round3Quota</strong>, <strong className="text-gray-700">round3Institute</strong>, <strong className="text-gray-700">round3Course</strong>, <strong className="text-gray-700">round3Status</strong>, <strong className="text-gray-700">round3OptionNo</strong>, <strong className="text-gray-700">round3Outcome</strong>.</li>
        </ul>
        <p className="text-xs text-gray-500">
          Base columns: examSlug, round, sourceYear, serialNo, rank, quota, institute, course, allottedCategory, candidateCategory, remarks, state, instituteType. Export first to get the exact header order for the selected round.
        </p>
      </div>
    </div>
  );
}

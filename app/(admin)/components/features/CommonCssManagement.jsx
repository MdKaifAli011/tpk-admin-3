"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  FaCode,
  FaCompressArrowsAlt,
  FaExpandArrowsAlt,
  FaRedo,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaUndo,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function CommonCssManagement() {
  const [css, setCss] = useState("");
  const [initialCss, setInitialCss] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { toasts, removeToast, success, error: showError } = useToast();

  const hasChanges = css !== initialCss;

  const loadCss = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/richtext-common-css");
      if (res.data?.success && typeof res.data?.data?.css === "string") {
        const nextCss = res.data.data.css;
        setCss(nextCss);
        setInitialCss(nextCss);
      } else {
        setError("Failed to load common CSS");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load common CSS");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    loadCss();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = isFullscreen ? "hidden" : previousOverflow || "";
    return () => {
      document.body.style.overflow = previousOverflow || "";
    };
  }, [isFullscreen]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!hasChanges) return;
    setSaving(true);
    try {
      const res = await api.put("/admin/richtext-common-css", { css });
      if (res.data?.success) {
        setInitialCss(css);
        success("Common CSS updated successfully.");
      } else {
        showError(res.data?.message || "Failed to save CSS");
      }
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save CSS");
    } finally {
      setSaving(false);
    }
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  const triggerEditorAction = async (actionId) => {
    const editor = editorRef.current;
    if (!editor) return;
    const action = editor.getAction(actionId);
    if (action) await action.run();
    editor.focus();
  };

  const handleUndo = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.trigger("keyboard", "undo", null);
    editor.focus();
  };

  const handleRedo = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.trigger("keyboard", "redo", null);
    editor.focus();
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
        <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg border border-gray-200 p-4 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Common Rich Content CSS</h1>
          <p className="text-sm text-gray-600">
            Edit the shared stylesheet used by rich content blocks in frontend and CKEditor preview.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className={
            isFullscreen
              ? "fixed inset-0 z-120 bg-white border-0 rounded-none shadow-none overflow-hidden"
              : "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
          }
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">
                <FaCode className="inline w-4 h-4 mr-1.5 text-indigo-600" />
                `public/commanStyle.css`
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                  title="Undo (Ctrl/Cmd+Z)"
                >
                  <FaUndo className="w-3.5 h-3.5" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                  title="Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)"
                >
                  <FaRedo className="w-3.5 h-3.5" />
                  Redo
                </button>
                <button
                  type="button"
                  onClick={() => triggerEditorAction("actions.find")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                  title="Find (Ctrl/Cmd+F)"
                >
                  <FaSearch className="w-3.5 h-3.5" />
                  Find
                </button>
                <button
                  type="button"
                  onClick={() => triggerEditorAction("editor.action.startFindReplaceAction")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                  title="Replace (Ctrl/Cmd+H)"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={loadCss}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FaSyncAlt className="w-3.5 h-3.5" />
                  Reload
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                >
                  {isFullscreen ? <FaCompressArrowsAlt className="w-3.5 h-3.5" /> : <FaExpandArrowsAlt className="w-3.5 h-3.5" />}
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </button>
              </div>
            </div>

            <div className="w-full border border-gray-300 rounded-lg overflow-hidden">
              <MonacoEditor
                height={isFullscreen ? "calc(100vh - 210px)" : "680px"}
                defaultLanguage="css"
                value={css}
                onChange={(value) => setCss(value ?? "")}
                onMount={handleEditorMount}
                options={{
                  automaticLayout: true,
                  fontSize: 13,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  lineHeight: 20,
                  minimap: { enabled: true },
                  wordWrap: "off",
                  smoothScrolling: true,
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  insertSpaces: true,
                  renderWhitespace: "selection",
                  contextmenu: true,
                  find: {
                    autoFindInSelection: "never",
                    addExtraSpaceOnTop: false,
                    seedSearchStringFromSelection: "always",
                  },
                }}
                theme="vs-dark"
              />
            </div>
          </div>

          {error && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <LoadingSpinner size="small" color="white" /> : <FaSave className="w-4 h-4" />}
              {saving ? "Saving..." : "Save CSS"}
            </button>
            <span className="text-xs text-gray-500">
              {hasChanges ? "Unsaved changes" : "No changes"}
            </span>
          </div>
        </form>
      </div>
    </>
  );
}

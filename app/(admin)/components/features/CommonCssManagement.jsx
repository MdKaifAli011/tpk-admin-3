"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCode,
  FaCompressArrowsAlt,
  FaExpandArrowsAlt,
  FaRedo,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaUndo,
} from "react-icons/fa";
import { ToastContainer, useToast } from "../ui/Toast";
import { LoadingSpinner } from "../ui/SkeletonLoader";
import api from "@/lib/api";
import Prism from "prismjs";
import "prismjs/components/prism-css";

export default function CommonCssManagement() {
  const [css, setCss] = useState("");
  const [initialCss, setInitialCss] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const editorTextareaRef = useRef(null);
  const editorPreRef = useRef(null);
  const findInputRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const historyTimerRef = useRef(null);
  const { toasts, removeToast, success, error: showError } = useToast();

  const resetHistory = (content) => {
    historyRef.current = [content];
    historyIndexRef.current = 0;
    setHistoryVersion((prev) => prev + 1);
  };

  const pushHistorySnapshot = (snapshot) => {
    if (historyIndexRef.current >= 0 && historyRef.current[historyIndexRef.current] === snapshot) return;
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(snapshot);
    if (next.length > 80) next.shift();
    historyRef.current = next;
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryVersion((prev) => prev + 1);
  };

  const loadCss = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/richtext-common-css");
      if (res.data?.success && typeof res.data?.data?.css === "string") {
        const nextCss = res.data.data.css;
        setCss(nextCss);
        setInitialCss(nextCss);
        resetHistory(nextCss);
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
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow || "";
    }
    return () => {
      document.body.style.overflow = previousOverflow || "";
    };
  }, [isFullscreen]);

  const hasChanges = css !== initialCss;
  const highlightedCss = useMemo(() => Prism.highlight(css || "", Prism.languages.css, "css"), [css]);
  const findMatches = useMemo(() => {
    if (!findQuery) return [];
    const source = css.toLowerCase();
    const needle = findQuery.toLowerCase();
    const out = [];
    let start = 0;
    while (true) {
      const idx = source.indexOf(needle, start);
      if (idx === -1) break;
      out.push({ start: idx, end: idx + needle.length });
      start = idx + Math.max(needle.length, 1);
      if (out.length > 5000) break;
    }
    return out;
  }, [css, findQuery]);
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  useEffect(() => {
    if (findMatches.length === 0) {
      setActiveMatchIndex(0);
      return;
    }
    if (activeMatchIndex > findMatches.length - 1) {
      setActiveMatchIndex(findMatches.length - 1);
    }
  }, [findMatches, activeMatchIndex]);

  const focusFindInput = () => {
    setShowFind(true);
    setTimeout(() => findInputRef.current?.focus(), 0);
  };

  const focusEditor = () => {
    editorTextareaRef.current?.focus();
  };

  const selectMatch = (index) => {
    if (!findMatches.length) return;
    const normalizedIndex = ((index % findMatches.length) + findMatches.length) % findMatches.length;
    const match = findMatches[normalizedIndex];
    setActiveMatchIndex(normalizedIndex);
    focusEditor();
    editorTextareaRef.current?.setSelectionRange(match.start, match.end);
  };

  const handleUndo = () => {
    if (!canUndo) return;
    historyIndexRef.current -= 1;
    const previousCss = historyRef.current[historyIndexRef.current];
    setCss(previousCss);
    setHistoryVersion((prev) => prev + 1);
    focusEditor();
  };

  const handleRedo = () => {
    if (!canRedo) return;
    historyIndexRef.current += 1;
    const nextCss = historyRef.current[historyIndexRef.current];
    setCss(nextCss);
    setHistoryVersion((prev) => prev + 1);
    focusEditor();
  };

  const handleCssChange = (nextCss) => {
    setCss(nextCss);
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      pushHistorySnapshot(nextCss);
    }, 350);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      if (!ctrlOrCmd) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        handleSave();
        return;
      }
      if (key === "f") {
        event.preventDefault();
        focusFindInput();
        return;
      }
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canRedo, canUndo, historyVersion, css, hasChanges]);

  const syncEditorScroll = () => {
    if (!editorTextareaRef.current || !editorPreRef.current) return;
    editorPreRef.current.scrollTop = editorTextareaRef.current.scrollTop;
    editorPreRef.current.scrollLeft = editorTextareaRef.current.scrollLeft;
  };

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
                `app/(main)/commanStyle.css`
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="Undo (Ctrl/Cmd+Z)"
                >
                  <FaUndo className="w-3.5 h-3.5" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)"
                >
                  <FaRedo className="w-3.5 h-3.5" />
                  Redo
                </button>
                <button
                  type="button"
                  onClick={focusFindInput}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                  title="Find (Ctrl/Cmd+F)"
                >
                  <FaSearch className="w-3.5 h-3.5" />
                  Find
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

            {showFind && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2.5">
                <div className="relative flex-1 min-w-[200px]">
                  <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    ref={findInputRef}
                    type="text"
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    placeholder="Find in CSS..."
                    className="w-full pl-8 pr-3 py-2 rounded-md border border-indigo-200 bg-white text-sm text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => selectMatch(activeMatchIndex - 1)}
                  disabled={findMatches.length === 0}
                  className="px-2.5 py-2 text-xs rounded-md border border-indigo-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => selectMatch(activeMatchIndex + 1)}
                  disabled={findMatches.length === 0}
                  className="px-2.5 py-2 text-xs rounded-md border border-indigo-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
                <span className="text-xs text-gray-600 min-w-[90px] text-right">
                  {findMatches.length ? `${activeMatchIndex + 1}/${findMatches.length}` : "0 results"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowFind(false);
                    focusEditor();
                  }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-indigo-200 bg-white text-gray-600 hover:bg-gray-50"
                  title="Close find"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="relative w-full border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
              <pre
                ref={editorPreRef}
                aria-hidden="true"
                className={`m-0 p-4 overflow-auto font-mono text-[13px] leading-5 bg-gray-950 text-gray-100 ${isFullscreen ? "h-[calc(100vh-210px)]" : "h-[680px]"}`}
              >
                <code
                  className="language-css block whitespace-pre"
                  dangerouslySetInnerHTML={{ __html: highlightedCss || " " }}
                />
              </pre>
              <textarea
                ref={editorTextareaRef}
                value={css}
                onChange={(e) => handleCssChange(e.target.value)}
                onScroll={syncEditorScroll}
                spellCheck={false}
                className="absolute inset-0 m-0 p-4 w-full h-full resize-none border-0 bg-transparent font-mono text-[13px] leading-5 text-transparent caret-white outline-none"
                placeholder="/* Common rich content CSS */"
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
      <style jsx global>{`
        .language-css .token.comment {
          color: #64748b;
          font-style: italic;
        }
        .language-css .token.atrule,
        .language-css .token.keyword {
          color: #c084fc;
        }
        .language-css .token.selector {
          color: #60a5fa;
        }
        .language-css .token.class,
        .language-css .token.id,
        .language-css .token.attr-name {
          color: #22d3ee;
        }
        .language-css .token.property {
          color: #f59e0b;
        }
        .language-css .token.function,
        .language-css .token.pseudo-class,
        .language-css .token.pseudo-element {
          color: #34d399;
        }
        .language-css .token.important,
        .language-css .token.string {
          color: #f472b6;
        }
        .language-css .token.number,
        .language-css .token.unit,
        .language-css .token.hexcode {
          color: #fca5a5;
        }
      `}</style>
    </>
  );
}

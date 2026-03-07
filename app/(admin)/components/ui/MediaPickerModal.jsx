"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaTimes, FaFolderOpen, FaImage, FaSpinner } from "react-icons/fa";
import api from "@/lib/api";

/**
 * MediaPickerModal – browse Media Management images and pick one URL.
 * Used by CourseForm (instructor image, course image, video thumbnail) and can be reused elsewhere.
 * GET /media/folders?type=image, GET /media?type=image&folder=...&limit=100
 */
export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = "Select image from Media",
}) {
  const [folder, setFolder] = useState("");
  const [folders, setFolders] = useState({ folders: [], tree: [] });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get("/media/folders?type=image"),
      api.get(`/media?type=image&limit=100&folder=${encodeURIComponent(folder)}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`),
    ])
      .then(([foldersRes, mediaRes]) => {
        if (cancelled) return;
        if (foldersRes.data?.success) {
          setFolders({
            folders: foldersRes.data.data?.folders ?? [],
            tree: foldersRes.data.data?.tree ?? [],
          });
        }
        if (mediaRes.data?.success) {
          const resData = mediaRes.data.data;
          const list = resData && (Array.isArray(resData.data) ? resData.data : Array.isArray(resData) ? resData : []);
          setItems(list);
        } else {
          setItems([]);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, folder, search]);

  const handleSelect = (item) => {
    if (item?.url) {
      onSelect(item.url);
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50/80">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Folder</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFolder("")}
                className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition ${folder === "" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
              >
                All images
              </button>
              {(folders.folders || []).map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setFolder(f.path)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition flex items-center gap-1.5 ${folder === f.path ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
                >
                  <FaFolderOpen className="w-4 h-4" />
                  {f.name || f.path}
                  {f.count != null ? ` (${f.count})` : ""}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Search by name</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter images..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <FaSpinner className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-gray-50 border border-gray-100">
              <FaImage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No images found</p>
              <p className="text-xs text-gray-400 mt-1">Upload images in Media Management to select them here.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">Click an image to use it.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {items.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="rounded-xl border-2 border-gray-200 overflow-hidden text-left transition hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <div className="aspect-square flex items-center justify-center bg-gray-100">
                      <img
                        src={item.url}
                        alt={item.altText || item.name || "Image"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="p-2 text-xs text-gray-600 truncate bg-white border-t border-gray-100" title={item.name || item.fileName}>
                      {item.name || item.fileName || "Image"}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}

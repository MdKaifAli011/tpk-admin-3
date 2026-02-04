"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaDownload,
  FaFile,
  FaLock,
  FaFolder,
  FaChevronDown,
  FaArrowLeft,
  FaSpinner,
} from "react-icons/fa";
import Link from "next/link";
import { createSlug } from "@/utils/slug";
import { isDownloadFormSubmitted, fetchFilesByFolder, fetchSubfoldersByFolder } from "../../../lib/api";
import DownloadModal from "../../../components/DownloadModal";
import { EmptyTopicsState, EmptyFolderContentState } from "../components/DownloadEmptyState";

const LOAD_MORE_LIMIT = 20;
const SUBFOLDER_PAGE_SIZE = 10;

const DownloadFolderPageClient = ({
  exam,
  examSlug,
  examName,
  currentFolder,
  allFolders,
  subfolders: initialSubfolders,
  totalSubfolders: totalSubfoldersProp = 0,
  files,
  filesBySubfolder = {},
}) => {
  const router = useRouter();
  const [isFormSubmitted, setIsFormSubmitted] = useState(() =>
    isDownloadFormSubmitted()
  );
  const [showModal, setShowModal] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  // Subfolders list (can grow when "View more" is clicked)
  const [subfoldersList, setSubfoldersList] = useState(initialSubfolders || []);
  const [totalSubfolders, setTotalSubfolders] = useState(totalSubfoldersProp ?? (initialSubfolders?.length ?? 0));
  const [loadingMoreSubfolders, setLoadingMoreSubfolders] = useState(false);
  // Accordion: which folder is expanded in "All folders" section
  const [expandedFolderId, setExpandedFolderId] = useState(null);
  // Cache: folderId -> { subfolders: [], loading: boolean }
  const [folderSubfoldersCache, setFolderSubfoldersCache] = useState({});
  // Per-subfolder: { files, total, nextPage, loadingMore }
  const [subfolderState, setSubfolderState] = useState(() => {
    const initial = {};
    (initialSubfolders || []).forEach((sf) => {
      const data = filesBySubfolder[String(sf._id)];
      if (data) {
        initial[String(sf._id)] = {
          files: data.files || [],
          total: data.total ?? (data.files?.length ?? 0),
          nextPage: 2,
          loadingMore: false,
        };
      }
    });
    if (Object.keys(filesBySubfolder).includes("direct")) {
      const data = filesBySubfolder.direct;
      initial.direct = {
        files: data.files || [],
        total: data.total ?? (data.files?.length ?? 0),
        nextPage: 2,
        loadingMore: false,
      };
    }
    return initial;
  });

  useEffect(() => {
    setSubfoldersList(initialSubfolders || []);
    setTotalSubfolders(totalSubfoldersProp ?? (initialSubfolders?.length ?? 0));
  }, [currentFolder._id, initialSubfolders, totalSubfoldersProp]);

  useEffect(() => {
    const next = {};
    (initialSubfolders || []).forEach((sf) => {
      const data = filesBySubfolder[String(sf._id)];
      if (data) {
        next[String(sf._id)] = {
          files: data.files || [],
          total: data.total ?? (data.files?.length ?? 0),
          nextPage: 2,
          loadingMore: false,
        };
      }
    });
    if (filesBySubfolder.direct) {
      const data = filesBySubfolder.direct;
      next.direct = {
        files: data.files || [],
        total: data.total ?? (data.files?.length ?? 0),
        nextPage: 2,
        loadingMore: false,
      };
    }
    setSubfolderState((prev) => (Object.keys(next).length ? next : prev));
  }, [currentFolder._id, initialSubfolders, filesBySubfolder]);

  const handleDownloadClick = (e, file) => {
    if (!isFormSubmitted) {
      e.preventDefault();
      setShowModal(true);
    }
  };

  const handleFormSuccess = () => {
    setIsFormSubmitted(true);
    setShowModal(false);
  };

  const handleModalClose = () => {
    setShowModal(false);
    // Always re-read from localStorage so unlock state is correct (e.g. after form submit)
    setIsFormSubmitted(isDownloadFormSubmitted());
  };

  // Re-sync unlock state when page becomes visible (e.g. user submitted form in modal, or in another tab)
  useEffect(() => {
    const syncUnlockState = () => setIsFormSubmitted(isDownloadFormSubmitted());
    syncUnlockState();
    window.addEventListener("focus", syncUnlockState);
    return () => window.removeEventListener("focus", syncUnlockState);
  }, []);

  const handleFolderChange = (folder) => {
    const folderSlug = folder.slug || createSlug(folder.name);
    router.push(`/${examSlug}/download/${folderSlug}`);
  };

  const loadMoreSubfolders = async () => {
    if (loadingMoreSubfolders || subfoldersList.length >= totalSubfolders) return;
    const nextPage = Math.floor(subfoldersList.length / SUBFOLDER_PAGE_SIZE) + 1;
    setLoadingMoreSubfolders(true);
    try {
      const res = await fetchSubfoldersByFolder(currentFolder._id, {
        status: "active",
        limit: SUBFOLDER_PAGE_SIZE,
        page: nextPage,
        onlyWithFiles: true,
        returnFullResponse: true,
      });
      const newList = res?.data || [];
      if (res?.pagination?.total != null) setTotalSubfolders(res.pagination.total);
      if (newList.length === 0) {
        setLoadingMoreSubfolders(false);
        return;
      }
      const fileResults = await Promise.all(
        newList.map((sf) =>
          fetchFilesByFolder(sf._id, {
            status: "active",
            limit: 10,
            page: 1,
            returnFullResponse: true,
          })
        )
      );
      const newState = {};
      newList.forEach((sf, i) => {
        const fr = fileResults[i];
        const list = fr?.data || [];
        const total = fr?.pagination?.total ?? list.length;
        newState[String(sf._id)] = {
          files: list.map((f) => ({ ...f, folderId: f.folderId?._id || f.folderId })),
          total,
          nextPage: 2,
          loadingMore: false,
        };
      });
      setSubfoldersList((prev) => [...prev, ...newList]);
      setSubfolderState((prev) => ({ ...prev, ...newState }));
    } catch (err) {
      console.error("Load more subfolders failed", err);
    } finally {
      setLoadingMoreSubfolders(false);
    }
  };

  const ACCORDION_SUBFOLDER_PAGE = 10;

  const toggleFolderAccordion = async (folder) => {
    const fid = String(folder._id);
    if (expandedFolderId === fid) {
      setExpandedFolderId(null);
      return;
    }
    setExpandedFolderId(fid);
    if (folderSubfoldersCache[fid]) return;
    setFolderSubfoldersCache((prev) => ({ ...prev, [fid]: { subfolders: [], total: 0, loading: true, loadingMore: false } }));
    try {
      const res = await fetchSubfoldersByFolder(folder._id, {
        status: "active",
        limit: ACCORDION_SUBFOLDER_PAGE,
        page: 1,
        onlyWithFiles: true,
        returnFullResponse: true,
      });
      const list = res?.data || [];
      const total = res?.pagination?.total ?? list.length;
      setFolderSubfoldersCache((prev) => ({
        ...prev,
        [fid]: { subfolders: list || [], total, loading: false, loadingMore: false },
      }));
    } catch (err) {
      console.error("Failed to fetch subfolders for accordion", err);
      setFolderSubfoldersCache((prev) => ({
        ...prev,
        [fid]: { subfolders: [], total: 0, loading: false, loadingMore: false },
      }));
    }
  };

  const loadMoreAccordionSubfolders = async (folder) => {
    const fid = String(folder._id);
    const cached = folderSubfoldersCache[fid];
    if (!cached || cached.loadingMore || (cached.subfolders?.length ?? 0) >= (cached.total ?? 0)) return;
    const nextPage = Math.floor((cached.subfolders?.length ?? 0) / ACCORDION_SUBFOLDER_PAGE) + 1;
    setFolderSubfoldersCache((prev) => ({ ...prev, [fid]: { ...prev[fid], loadingMore: true } }));
    try {
      const res = await fetchSubfoldersByFolder(folder._id, {
        status: "active",
        limit: ACCORDION_SUBFOLDER_PAGE,
        page: nextPage,
        onlyWithFiles: true,
        returnFullResponse: true,
      });
      const newList = res?.data || [];
      const total = res?.pagination?.total ?? cached.total;
      setFolderSubfoldersCache((prev) => ({
        ...prev,
        [fid]: {
          subfolders: [...(prev[fid].subfolders || []), ...newList],
          total,
          loading: false,
          loadingMore: false,
        },
      }));
    } catch (err) {
      console.error("Load more accordion subfolders failed", err);
      setFolderSubfoldersCache((prev) => ({ ...prev, [fid]: { ...prev[fid], loadingMore: false } }));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const loadMoreForSubfolder = async (subfolderIdOrKey) => {
    const isDirect = subfolderIdOrKey === "direct";
    const key = isDirect ? "direct" : String(subfolderIdOrKey);
    const folderIdForApi = isDirect ? currentFolder._id : subfolderIdOrKey;
    const cur = subfolderState[key];
    if (!cur || cur.loadingMore || cur.files.length >= cur.total) return;
    const currentLength = cur.files.length;
    setSubfolderState((prev) => ({
      ...prev,
      [key]: { ...prev[key], loadingMore: true },
    }));
    try {
      const res = await fetchFilesByFolder(folderIdForApi, {
        status: "active",
        limit: LOAD_MORE_LIMIT,
        skip: currentLength,
        returnFullResponse: true,
      });
      const list = res?.data || [];
      const total = res?.pagination?.total ?? cur.total;
      setSubfolderState((prev) => ({
        ...prev,
        [key]: {
          files: [...(prev[key].files || []), ...list],
          total,
          nextPage: prev[key].nextPage,
          loadingMore: false,
        },
      }));
    } catch (err) {
      console.error("Load more files failed", err);
      setSubfolderState((prev) => ({
        ...prev,
        [key]: { ...prev[key], loadingMore: false },
      }));
    }
  };

  return (
    <>
      <div className="space-y-6 bg-gray-50/80 min-h-screen pb-8">
        {/* Header - Folder name (breadcrumb style) + dropdown */}
        <section className="rounded-xl p-4 sm:p-5 bg-white border border-gray-200 shadow-sm">
          <div className="flex flex-col gap-3">
            <Link
              href={`/${examSlug}/download`}
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 w-fit"
            >
              <FaArrowLeft className="w-4 h-4 shrink-0" />
              Back to Study Material
            </Link>
            <div className="flex items-start sm:items-center justify-between w-full gap-3 sm:gap-4">
              <div className="flex flex-col min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-bold text-gray-800 uppercase tracking-wide truncate max-w-[200px] sm:max-w-[360px]" title={currentFolder.name}>
                  {examName} / {currentFolder.name}
                </h1>
                <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-[280px]">
                  Select a topic below to view and download files
                </p>
              </div>

              {/* RIGHT — Folder Dropdown */}
              {allFolders.length > 1 && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all text-xs sm:text-sm font-medium text-indigo-700 shadow-sm"
                >
                  <FaFolder className="w-4 h-4" />
                  <span className="max-w-[120px] sm:max-w-[180px] truncate">
                    {currentFolder.name}
                  </span>
                  <FaChevronDown
                    className={`w-3 h-3 transition-transform ${
                      showFolderDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showFolderDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowFolderDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
                      <div className="p-2">
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 mb-1">
                          Change Folder
                        </div>
                        {allFolders.map((folder) => (
                          <button
                            key={folder._id}
                            onClick={() => {
                              handleFolderChange(folder);
                              setShowFolderDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              folder._id === currentFolder._id
                                ? "bg-indigo-50 text-indigo-600 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <FaFolder className="w-3 h-3" />
                              <span>{folder.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            </div>
          </div>
        </section>

        {/* Subfolders with Files Section */}
        {subfoldersList.length > 0 ? (
          <div className="space-y-6">
            {subfoldersList.map((subfolder) => {
              const state = subfolderState[String(subfolder._id)] || {
                files: [],
                total: 0,
                nextPage: 2,
                loadingMore: false,
              };
              const subfolderFiles = state.files;
              const total = state.total;
              const hasMore = subfolderFiles.length < total;

              const subfolderSlug =
                subfolder.slug || createSlug(subfolder.name);
              const folderSlug =
                currentFolder.slug || createSlug(currentFolder.name);

              if (subfolderFiles.length === 0) return null;

              return (
                <div key={subfolder._id} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                  <Link
                    href={`/${examSlug}/download/${folderSlug}/${subfolderSlug}`}
                    className="block bg-blue-50 border-b border-blue-100 px-4 py-3.5 hover:bg-blue-100/80 transition-colors"
                  >
                    <h2 className="text-sm font-bold text-gray-900">{subfolder.name}</h2>
                    <p className="text-xs text-gray-600 mt-0.5">View all files in this topic</p>
                  </Link>
                  <div className="overflow-hidden">
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">File</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subfolderFiles.map((file, index) => (
                              <tr
                                key={file._id}
                                className={`${
                                  index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                } hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0`}
                              >
                                <td className="px-4 py-3 text-sm">
                                  <Link
                                    href={`/${examSlug}/download/${folderSlug}/${subfolderSlug}/${file.slug || createSlug(file.name)}`}
                                    className="text-gray-900 font-medium hover:text-indigo-600 hover:underline"
                                  >
                                    {file.name}
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  PDF File
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isFormSubmitted ? (
                                    <a
                                      href={
                                        file.fileType === "url"
                                          ? file.fileUrl
                                          : file.uploadedFile
                                      }
                                      target={
                                        file.fileType === "url"
                                          ? "_blank"
                                          : "_self"
                                      }
                                      rel={
                                        file.fileType === "url"
                                          ? "noopener noreferrer"
                                          : ""
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all"
                                    >
                                      <FaDownload className="w-3.5 h-3.5" />
                                      <span>Download</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleDownloadClick(e, file)
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-amber-700 bg-amber-50 border border-amber-200 text-sm font-medium rounded-lg hover:bg-amber-100 transition-all cursor-pointer"
                                      title="Fill the form to unlock downloads"
                                    >
                                      <FaLock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Download Files</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden divide-y divide-gray-200">
                        {subfolderFiles.map((file, index) => (
                          <div
                            key={file._id}
                            className={`p-4 ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/${examSlug}/download/${folderSlug}/${subfolderSlug}/${file.slug || createSlug(file.name)}`}
                                  className="block"
                                >
                                  <h3 className="text-sm font-medium text-gray-900 mb-1 hover:text-indigo-600 hover:underline">
                                    {file.name}
                                  </h3>
                                </Link>
                                <p className="text-xs text-gray-600">
                                  PDF File
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end mt-3">
                              {isFormSubmitted ? (
                                <a
                                  href={
                                    file.fileType === "url"
                                      ? file.fileUrl
                                      : file.uploadedFile
                                  }
                                  target={
                                    file.fileType === "url" ? "_blank" : "_self"
                                  }
                                  rel={
                                    file.fileType === "url"
                                      ? "noopener noreferrer"
                                      : ""
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-all"
                                >
                                  <FaDownload className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadClick(e, file)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-amber-700 bg-amber-50 border border-amber-200 text-sm font-medium rounded-lg hover:bg-amber-100 transition-all cursor-pointer"
                                  title="Fill the form to unlock downloads"
                                >
                                  <FaLock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Download Files</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {hasMore && (
                        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/80 flex justify-center">
                          <button
                            type="button"
                            onClick={() => loadMoreForSubfolder(subfolder._id)}
                            disabled={state.loadingMore}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                          >
                            {state.loadingMore ? (
                              <>
                                <FaSpinner className="w-4 h-4 animate-spin" />
                                Loading…
                              </>
                            ) : (
                              <>View more ({subfolderFiles.length} of {total})</>
                            )}
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
            {subfoldersList.length < totalSubfolders && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={loadMoreSubfolders}
                  disabled={loadingMoreSubfolders}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                >
                  {loadingMoreSubfolders ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>View more topics ({subfoldersList.length} of {totalSubfolders})</>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Files directly in folder (no subfolders) - Table Format */
          (() => {
            const direct = subfolderState.direct || { files: files || [], total: (files || []).length, nextPage: 2, loadingMore: false };
            const directFiles = direct.files;
            const directTotal = direct.total;
            const directHasMore = directFiles.length < directTotal;
            return directFiles.length > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
              <div className="bg-blue-50 border-b border-blue-100 px-4 py-3.5">
                <h2 className="text-sm font-bold text-gray-900">Files</h2>
                <p className="text-xs text-gray-600 mt-0.5">Download files in this folder</p>
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">File</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directFiles.map((file, index) => (
                      <tr
                        key={file._id}
                        className={`${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        } hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {file.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          PDF File
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isFormSubmitted ? (
                            <a
                              href={
                                file.fileType === "url"
                                  ? file.fileUrl
                                  : file.uploadedFile
                              }
                              target={
                                file.fileType === "url" ? "_blank" : "_self"
                              }
                              rel={
                                file.fileType === "url"
                                  ? "noopener noreferrer"
                                  : ""
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-all"
                            >
                              <FaDownload className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleDownloadClick(e, file)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-amber-700 bg-amber-50 border border-amber-200 text-sm font-medium rounded-lg hover:bg-amber-100 transition-all cursor-pointer"
                              title="Fill the form to unlock downloads"
                            >
                              <FaLock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Download Files</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-200">
                {directFiles.map((file, index) => (
                  <div
                    key={file._id}
                    className={`p-4 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {file.name}
                        </h3>
                        <p className="text-xs text-gray-600">PDF File</p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      {isFormSubmitted ? (
                        <a
                          href={
                            file.fileType === "url"
                              ? file.fileUrl
                              : file.uploadedFile
                          }
                          target={file.fileType === "url" ? "_blank" : "_self"}
                          rel={
                            file.fileType === "url" ? "noopener noreferrer" : ""
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all"
                        >
                          <FaDownload className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleDownloadClick(e, file)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-amber-700 bg-amber-50 border border-amber-200 text-sm font-medium rounded-lg hover:bg-amber-100 transition-all cursor-pointer"
                          title="Fill the form to unlock downloads"
                        >
                          <FaLock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Download Files</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {directHasMore && (
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-center">
                  <button
                    type="button"
                    onClick={() => loadMoreForSubfolder("direct")}
                    disabled={direct.loadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                  >
                    {direct.loadingMore ? (
                      <>
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>View more ({directFiles.length} of {directTotal})</>
                    )}
                  </button>
                </div>
              )}
            </div>
            );
          })()
        )}

        {/* All folders – accordion (only folders with topics or files) */}
        {(() => {
          const foldersWithContent = allFolders.filter(
            (f) => (f.subfolderCount ?? 0) > 0 || (f.fileCount ?? 0) > 0
          );
          return foldersWithContent.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-3.5">
              <h2 className="text-sm font-bold text-gray-900">All folders</h2>
              <p className="text-xs text-gray-600 mt-0.5">Click a folder to see its topics, then open the one you need</p>
            </div>
            <div className="divide-y divide-gray-100">
              {foldersWithContent.map((f) => {
                const fSlug = f.slug || createSlug(f.name);
                const isCurrent = String(f._id) === String(currentFolder._id);
                const isExpanded = expandedFolderId === String(f._id);
                const cached = folderSubfoldersCache[String(f._id)];
                const accordionSubfolders = cached?.subfolders ?? [];
                const accordionTotal = cached?.total ?? 0;
                const loading = cached?.loading ?? false;
                const accordionLoadingMore = cached?.loadingMore ?? false;
                const accordionHasMore = accordionSubfolders.length < accordionTotal;
                return (
                  <div key={f._id} className="bg-white">
                    <div
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleFolderAccordion(f)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleFolderAccordion(f);
                        }
                      }}
                      aria-expanded={isExpanded}
                    >
                      <span className="shrink-0 w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <FaFolder className={`w-4 h-4 ${isCurrent ? "text-indigo-600" : "text-indigo-500"}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-semibold ${isCurrent ? "text-indigo-700" : "text-gray-900"}`}>
                          {f.name}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 text-xs text-indigo-600 font-medium">(current)</span>
                        )}
                      </div>
                      <Link
                        href={`/${examSlug}/download/${fSlug}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open
                      </Link>
                      <span
                        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform ${isExpanded ? "rotate-180 bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        <FaChevronDown className="w-3 h-3" />
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50">
                        {loading ? (
                          <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                            <FaSpinner className="w-4 h-4 animate-spin" />
                            Loading topics…
                          </div>
                        ) : accordionSubfolders.length === 0 ? (
                          <EmptyTopicsState
                            folderName={f.name}
                            openHref={`/${examSlug}/download/${fSlug}`}
                          />
                        ) : (
                          <>
                            <ul className="py-2">
                              {accordionSubfolders.map((sf) => {
                                const sfSlug = sf.slug || createSlug(sf.name);
                                return (
                                  <li key={sf._id}>
                                    <Link
                                      href={`/${examSlug}/download/${fSlug}/${sfSlug}`}
                                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-l-2 border-transparent hover:border-indigo-300 pl-6"
                                    >
                                      <FaFolder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                      <span className="font-medium">{sf.name}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                            {accordionHasMore && (
                              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/80 flex justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); loadMoreAccordionSubfolders(f); }}
                                  disabled={accordionLoadingMore}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                                >
                                  {accordionLoadingMore ? (
                                    <>
                                      <FaSpinner className="w-4 h-4 animate-spin" />
                                      Loading…
                                    </>
                                  ) : (
                                    <>View more topics ({accordionSubfolders.length} of {accordionTotal})</>
                                  )}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* Empty State – folder has no topics and no files */}
        {subfoldersList.length === 0 && files.length === 0 && (
          <EmptyFolderContentState backHref={`/${examSlug}/download`} />
        )}
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};

export default DownloadFolderPageClient;

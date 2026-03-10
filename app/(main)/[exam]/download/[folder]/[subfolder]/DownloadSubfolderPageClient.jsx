"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaDownload,
  FaFile,
  FaLock,
  FaFolder,
  FaChevronDown,
  FaArrowLeft,
  FaSpinner,
} from "react-icons/fa";
import { createSlug } from "@/utils/slug";
import { isDownloadFormSubmitted, fetchFilesByFolder, fetchSubfoldersByFolder } from "../../../../lib/api";
import DownloadModal from "../../../../components/DownloadModal";
import { EmptyTopicsState, EmptyFilesState, EmptyTopicFilesMainState } from "../../components/DownloadEmptyState";

const INITIAL_FILE_LIMIT = 10;
const LOAD_MORE_LIMIT = 20;

const DownloadSubfolderPageClient = ({
  exam,
  examSlug,
  examName,
  currentFolder,
  currentSubfolder,
  allFolders,
  subfolders,
  files,
  totalFiles: totalFilesProp = 0,
}) => {
  const router = useRouter();
  const [filesList, setFilesList] = useState(files || []);
  const [totalFiles, setTotalFiles] = useState(totalFilesProp ?? (files?.length ?? 0));
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(() =>
    isDownloadFormSubmitted()
  );
  const [showModal, setShowModal] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showSubfolderDropdown, setShowSubfolderDropdown] = useState(false);
  // Accordion: Other topics – which subfolder is expanded; cache: subfolderId -> { files, total, loading }
  const [expandedSubfolderId, setExpandedSubfolderId] = useState(null);
  const [subfolderFilesCache, setSubfolderFilesCache] = useState({});
  // Accordion: All folders – which folder is expanded; cache: folderId -> { subfolders, loading }
  const [expandedFolderId, setExpandedFolderId] = useState(null);
  const [folderSubfoldersCache, setFolderSubfoldersCache] = useState({});

  const folderSlug = currentFolder.slug || createSlug(currentFolder.name);
  const subfolderSlug = currentSubfolder.slug || createSlug(currentSubfolder.name);
  const hasMoreFiles = filesList.length < totalFiles;

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

  useEffect(() => {
    setFilesList(files || []);
    setTotalFiles(totalFilesProp ?? (files?.length ?? 0));
  }, [currentSubfolder._id, files, totalFilesProp]);

  // Re-sync unlock state when page becomes visible (e.g. user submitted form in modal, or in another tab)
  useEffect(() => {
    const syncUnlockState = () => setIsFormSubmitted(isDownloadFormSubmitted());
    syncUnlockState();
    window.addEventListener("focus", syncUnlockState);
    return () => window.removeEventListener("focus", syncUnlockState);
  }, []);

  const loadMoreFiles = async () => {
    if (loadingMore || !hasMoreFiles) return;
    const skip = filesList.length;
    setLoadingMore(true);
    try {
      const res = await fetchFilesByFolder(currentSubfolder._id, {
        status: "active",
        limit: LOAD_MORE_LIMIT,
        skip,
        returnFullResponse: true,
      });
      const list = res?.data || [];
      setFilesList((prev) => [...prev, ...list]);
      if (res?.pagination?.total != null) setTotalFiles(res.pagination.total);
    } catch (err) {
      console.error("Load more files failed", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFolderChange = (folder) => {
    const folderSlug = folder.slug || createSlug(folder.name);
    router.push(`/${examSlug}/download/${folderSlug}`);
  };

  const handleSubfolderChange = (subfolder) => {
    const folderSlug = currentFolder.slug || createSlug(currentFolder.name);
    const subfolderSlug = subfolder.slug || createSlug(subfolder.name);
    router.push(`/${examSlug}/download/${folderSlug}/${subfolderSlug}`);
  };

  const toggleSubfolderAccordion = async (sf) => {
    const sid = String(sf._id);
    if (expandedSubfolderId === sid) {
      setExpandedSubfolderId(null);
      return;
    }
    setExpandedSubfolderId(sid);
    if (subfolderFilesCache[sid]) return;
    setSubfolderFilesCache((prev) => ({ ...prev, [sid]: { files: [], total: 0, loading: true } }));
    try {
      const res = await fetchFilesByFolder(sf._id, {
        status: "active",
        limit: 10,
        page: 1,
        returnFullResponse: true,
      });
      const list = res?.data || [];
      const total = res?.pagination?.total ?? list.length;
      setSubfolderFilesCache((prev) => ({
        ...prev,
        [sid]: { files: list, total, loading: false },
      }));
    } catch (err) {
      console.error("Failed to fetch files for topic accordion", err);
      setSubfolderFilesCache((prev) => ({
        ...prev,
        [sid]: { files: [], total: 0, loading: false },
      }));
    }
  };

  const loadMoreFilesInAccordion = async (subfolderId) => {
    const sid = String(subfolderId);
    const cached = subfolderFilesCache[sid];
    if (!cached || cached.loading || cached.files.length >= cached.total) return;
    const skip = cached.files.length;
    setSubfolderFilesCache((prev) => ({ ...prev, [sid]: { ...prev[sid], loading: true } }));
    try {
      const res = await fetchFilesByFolder(subfolderId, {
        status: "active",
        limit: LOAD_MORE_LIMIT,
        skip,
        returnFullResponse: true,
      });
      const list = res?.data || [];
      const total = res?.pagination?.total ?? cached.total;
      setSubfolderFilesCache((prev) => ({
        ...prev,
        [sid]: {
          files: [...(prev[sid].files || []), ...list],
          total,
          loading: false,
        },
      }));
    } catch (err) {
      console.error("Load more files in accordion failed", err);
      setSubfolderFilesCache((prev) => ({ ...prev, [sid]: { ...prev[sid], loading: false } }));
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

  return (
    <>
      <div className="space-y-6 bg-gray-50/80 min-h-screen pb-8">
        {/* Header - breadcrumb style (EXAM / FOLDER / SUBFOLDER) */}
        <section className="hero-section rounded-xl p-4 sm:p-5 bg-white border border-gray-200 shadow-sm" aria-labelledby="download-subfolder-title">
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
                <h1 id="download-subfolder-title" className="text-base sm:text-lg font-bold text-gray-800 uppercase tracking-wide truncate max-w-[200px] sm:max-w-[360px]" title={`${examName} / ${currentFolder.name} / ${currentSubfolder.name}`}>
                  {examName} / {currentFolder.name} / {currentSubfolder.name}
                </h1>
                <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-[280px]">
                  View and download files in this topic
                </p>
              </div>

              {/* RIGHT — Folder and Subfolder Dropdowns */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Folder Dropdown */}
                {allFolders.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowFolderDropdown(!showFolderDropdown);
                        setShowSubfolderDropdown(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all text-xs sm:text-sm font-medium text-indigo-700 shadow-sm"
                    >
                      <FaFolder className="w-4 h-4" />
                      <span className="max-w-[100px] sm:max-w-[140px] truncate">
                        {currentFolder.name}
                      </span>
                      <FaChevronDown
                        className={`w-3 h-3 transition-transform ${showFolderDropdown ? "rotate-180" : ""
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
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${folder._id === currentFolder._id
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

                {/* Subfolder Dropdown */}
                {subfolders.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowSubfolderDropdown(!showSubfolderDropdown);
                        setShowFolderDropdown(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all text-xs sm:text-sm font-medium text-indigo-700 shadow-sm"
                    >
                      <FaFolder className="w-4 h-4" />
                      <span className="max-w-[100px] sm:max-w-[140px] truncate">
                        {currentSubfolder.name}
                      </span>
                      <FaChevronDown
                        className={`w-3 h-3 transition-transform ${showSubfolderDropdown ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {showSubfolderDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowSubfolderDropdown(false)}
                        />
                        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
                          <div className="p-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 mb-1">
                              Change Subfolder
                            </div>
                            {subfolders.map((subfolder) => (
                              <button
                                key={subfolder._id}
                                onClick={() => {
                                  handleSubfolderChange(subfolder);
                                  setShowSubfolderDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${subfolder._id === currentSubfolder._id
                                  ? "bg-indigo-50 text-indigo-600 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <FaFolder className="w-3 h-3" />
                                  <span>{subfolder.name}</span>
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
          </div>
        </section>

        {/* Files Section - Card with light blue subfolder bar + table */}
        {filesList.length > 0 ? (
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-3.5">
              <h2 className="text-sm font-bold text-gray-900">{currentSubfolder.name}</h2>
              <p className="text-xs text-gray-600 mt-0.5">View all files in this topic</p>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">File</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Size</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filesList.map((file, index) => {
                    const filePageHref = `/${examSlug}/download/${folderSlug}/${subfolderSlug}/${(file.slug || createSlug(file.name))}`;
                    return (
                      <tr
                        key={file._id}
                        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0`}
                      >
                        <td className="px-4 py-3">
                          <Link href={filePageHref} className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline">
                            {file.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{file.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{file.fileSize ? formatFileSize(file.fileSize) : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {isFormSubmitted ? (
                            <a
                              href={file.fileType === "url" ? file.fileUrl : file.uploadedFile}
                              target={file.fileType === "url" ? "_blank" : "_self"}
                              rel={file.fileType === "url" ? "noopener noreferrer" : ""}
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-200">
              {filesList.map((file, index) => {
                const filePageHref = `/${examSlug}/download/${folderSlug}/${subfolderSlug}/${(file.slug || createSlug(file.name))}`;
                return (
                  <div key={file._id} className={`p-4 flex flex-col gap-2 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <Link href={filePageHref} className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline">
                      {file.name}
                    </Link>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">
                        {file.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
                        {file.fileSize ? ` · ${formatFileSize(file.fileSize)}` : ""}
                      </span>
                      {isFormSubmitted ? (
                        <a
                          href={file.fileType === "url" ? file.fileUrl : file.uploadedFile}
                          target={file.fileType === "url" ? "_blank" : "_self"}
                          rel={file.fileType === "url" ? "noopener noreferrer" : ""}
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
                );
              })}
            </div>
            {hasMoreFiles && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/80 flex justify-center">
                <button
                  type="button"
                  onClick={loadMoreFiles}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 disabled:opacity-60 transition-colors"
                >
                  {loadingMore ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>View more files ({filesList.length} of {totalFiles})</>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <EmptyTopicFilesMainState
            folderName={currentFolder.name}
            backHref={`/${examSlug}/download/${folderSlug}`}
          />
        )}

        {/* Other topics in this folder – row list + accordion (click to load & show files) */}
        {subfolders.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-3.5">
              <h2 className="text-sm font-bold text-gray-900">Other topics in {currentFolder.name}</h2>
              <p className="text-xs text-gray-600 mt-0.5">Click a topic to see its files, then open or download</p>
            </div>
            <div className="divide-y divide-gray-100">
              {subfolders.map((sf) => {
                const sfSlug = sf.slug || createSlug(sf.name);
                const isCurrent = String(sf._id) === String(currentSubfolder._id);
                const isExpanded = expandedSubfolderId === String(sf._id);
                const cached = subfolderFilesCache[String(sf._id)];
                const accordionFiles = cached?.files ?? [];
                const accordionTotal = cached?.total ?? 0;
                const accordionLoading = cached?.loading ?? false;
                const accordionHasMore = accordionFiles.length < accordionTotal;
                return (
                  <div key={sf._id} className="bg-white">
                    <div
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleSubfolderAccordion(sf)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSubfolderAccordion(sf);
                        }
                      }}
                      aria-expanded={isExpanded}
                    >
                      <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? "bg-indigo-100" : "bg-gray-100"}`}>
                        <FaFolder className={`w-4 h-4 ${isCurrent ? "text-indigo-600" : "text-gray-500"}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-semibold ${isCurrent ? "text-indigo-700" : "text-gray-900"}`}>
                          {sf.name}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 text-xs text-indigo-600 font-medium">(current)</span>
                        )}
                      </div>
                      <Link
                        href={`/${examSlug}/download/${folderSlug}/${sfSlug}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open topic
                      </Link>
                      <span
                        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform ${isExpanded ? "rotate-180 bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        <FaChevronDown className="w-3 h-3" />
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50">
                        {accordionLoading && !cached?.files?.length ? (
                          <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                            <FaSpinner className="w-4 h-4 animate-spin" />
                            Loading files…
                          </div>
                        ) : accordionFiles.length === 0 ? (
                          <EmptyFilesState
                            topicName={sf.name}
                            openHref={`/${examSlug}/download/${folderSlug}/${sfSlug}`}
                          />
                        ) : (
                          <>
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">File</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {accordionFiles.map((file, index) => {
                                    const filePageHref = `/${examSlug}/download/${folderSlug}/${sfSlug}/${(file.slug || createSlug(file.name))}`;
                                    return (
                                      <tr
                                        key={file._id}
                                        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0`}
                                      >
                                        <td className="px-4 py-2.5">
                                          <Link href={filePageHref} className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline">
                                            {file.name}
                                          </Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-gray-600">{file.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}</td>
                                        <td className="px-4 py-2.5 text-right">
                                          {isFormSubmitted ? (
                                            <a
                                              href={file.fileType === "url" ? file.fileUrl : file.uploadedFile}
                                              target={file.fileType === "url" ? "_blank" : "_self"}
                                              rel={file.fileType === "url" ? "noopener noreferrer" : ""}
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                                            >
                                              <FaDownload className="w-3 h-3" />
                                              Download
                                            </a>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleDownloadClick(e, file); }}
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-amber-700 bg-amber-50 border border-amber-200 text-xs font-medium rounded-lg hover:bg-amber-100"
                                            >
                                              <FaLock className="w-3 h-3 text-amber-600" />
                                              Download Files
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="md:hidden divide-y divide-gray-100">
                              {accordionFiles.map((file) => {
                                const filePageHref = `/${examSlug}/download/${folderSlug}/${sfSlug}/${(file.slug || createSlug(file.name))}`;
                                return (
                                  <div key={file._id} className="px-4 py-3 flex flex-col gap-2">
                                    <Link href={filePageHref} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                                      {file.name}
                                    </Link>
                                    <div className="flex justify-end">
                                      {isFormSubmitted ? (
                                        <a
                                          href={file.fileType === "url" ? file.fileUrl : file.uploadedFile}
                                          target={file.fileType === "url" ? "_blank" : "_self"}
                                          rel={file.fileType === "url" ? "noopener noreferrer" : ""}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg"
                                        >
                                          <FaDownload className="w-3 h-3" />
                                          Download
                                        </a>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleDownloadClick(e, file); }}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-amber-700 bg-amber-50 border border-amber-200 text-xs font-medium rounded-lg"
                                        >
                                          <FaLock className="w-3 h-3 text-amber-600" />
                                          Download Files
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {accordionHasMore && (
                              <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/80 flex justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); loadMoreFilesInAccordion(sf._id); }}
                                  disabled={accordionLoading}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-60"
                                >
                                  {accordionLoading ? (
                                    <>
                                      <FaSpinner className="w-3 h-3 animate-spin" />
                                      Loading…
                                    </>
                                  ) : (
                                    <>View more ({accordionFiles.length} of {accordionTotal})</>
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
        )}

        {/* All folders – only folders with topics or files */}
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
                          <span className="ml-2 text-xs text-indigo-600 font-medium">(current folder)</span>
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
                              const isCurrentTopic = String(sf._id) === String(currentSubfolder._id);
                              return (
                                <li key={sf._id}>
                                  <Link
                                    href={`/${examSlug}/download/${fSlug}/${sfSlug}`}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-l-2 pl-6 ${
                                      isCurrentTopic
                                        ? "bg-indigo-50 text-indigo-700 font-medium border-indigo-300"
                                        : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border-transparent hover:border-indigo-300"
                                    }`}
                                  >
                                    <FaFolder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    <span>{sf.name}</span>
                                    {isCurrentTopic && (
                                      <span className="text-xs text-indigo-600 ml-1">(current)</span>
                                    )}
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

export default DownloadSubfolderPageClient;

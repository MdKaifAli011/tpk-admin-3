"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaDownload,
  FaFile,
  FaLink,
  FaLock,
  FaFolder,
  FaChevronDown,
} from "react-icons/fa";
import { createSlug } from "@/utils/slug";
import { isDownloadFormSubmitted } from "../../../../lib/api";
import DownloadModal from "../../../../components/DownloadModal";

const DownloadSubfolderPageClient = ({
  exam,
  examSlug,
  examName,
  currentFolder,
  currentSubfolder,
  allFolders,
  subfolders,
  files,
}) => {
  const router = useRouter();
  const [isFormSubmitted, setIsFormSubmitted] = useState(() =>
    isDownloadFormSubmitted()
  );
  const [showModal, setShowModal] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showSubfolderDropdown, setShowSubfolderDropdown] = useState(false);

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

  const handleFolderChange = (folder) => {
    const folderSlug = folder.slug || createSlug(folder.name);
    router.push(`/${examSlug}/download/${folderSlug}`);
  };

  const handleSubfolderChange = (subfolder) => {
    const folderSlug = currentFolder.slug || createSlug(currentFolder.name);
    const subfolderSlug = subfolder.slug || createSlug(subfolder.name);
    router.push(`/${examSlug}/download/${folderSlug}/${subfolderSlug}`);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header Section - Matching Subject Page Style */}
        <section
          className="
            rounded-xl
            p-3 sm:p-4
            bg-gradient-to-br from-indigo-50 via-white to-purple-50
            border border-indigo-100/60
            shadow-[0_2px_12px_rgba(100,70,200,0.08)]
          "
        >
          <div className="flex items-start sm:items-center justify-between w-full gap-3 sm:gap-4">
            {/* LEFT — Title + Breadcrumb */}
            <div className="flex flex-col min-w-0 flex-1">
              <h1
                className="
                  text-base sm:text-lg md:text-xl font-bold text-indigo-900
                  truncate
                  max-w-[180px] sm:max-w-[260px] md:max-w-[320px]
                "
                title={`${examName} / ${currentFolder.name} / ${currentSubfolder.name}`}
              >
                {currentSubfolder.name}
              </h1>

              <p
                className="
                  text-[10px] sm:text-xs text-gray-600 mt-0.5
                  truncate
                  max-w-[160px] sm:max-w-[220px]
                "
                title={`${examName} > ${currentFolder.name} > ${currentSubfolder.name}`}
              >
                {examName} &gt; {currentFolder.name} &gt;{" "}
                {currentSubfolder.name}
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
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
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
                      className={`w-3 h-3 transition-transform ${
                        showSubfolderDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showSubfolderDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSubfolderDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
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
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                subfolder._id === currentSubfolder._id
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
        </section>

        {/* Subfolder Name - Blue Bar */}
        <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg">
          <h2 className="text-sm font-semibold">{currentSubfolder.name}</h2>
        </div>

        {/* Files Section - Card Grid */}
        {files.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <div
                key={file._id}
                className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`p-3 rounded-xl flex-shrink-0 ${
                        file.fileType === "url"
                          ? "bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200"
                          : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-gray-200 group-hover:to-gray-300"
                      } transition-all duration-300 shadow-sm`}
                    >
                      {file.fileType === "url" ? (
                        <FaLink className="w-6 h-6 text-blue-600" />
                      ) : (
                        <FaFile className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-2">
                        {file.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          {file.mimeType?.split("/")[1]?.toUpperCase() ||
                            "FILE"}
                        </span>
                        {file.fileSize && (
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                              />
                            </svg>
                            {formatFileSize(file.fileSize)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto">
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
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-sm"
                      >
                        <FaDownload className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                    ) : (
                      <button
                        onClick={(e) => handleDownloadClick(e, file)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-400 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-gray-500 transition-all"
                      >
                        <FaLock className="w-4 h-4" />
                        <span>Locked</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 p-12 text-center">
            <FaFile className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Files Available
            </h3>
            <p className="text-sm text-gray-600">
              Files will appear here once they are added to this subfolder.
            </p>
          </div>
        )}
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};

export default DownloadSubfolderPageClient;

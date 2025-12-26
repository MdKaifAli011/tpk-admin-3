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
import Link from "next/link";
import { createSlug } from "@/utils/slug";
import { isDownloadFormSubmitted } from "../../../lib/api";
import DownloadModal from "../../../components/DownloadModal";

const DownloadFolderPageClient = ({
  exam,
  examSlug,
  examName,
  currentFolder,
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
    // Check localStorage again in case form was submitted
    setIsFormSubmitted(isDownloadFormSubmitted());
  };

  const handleFolderChange = (folder) => {
    const folderSlug = folder.slug || createSlug(folder.name);
    router.push(`/${examSlug}/download/${folderSlug}`);
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
                title={currentFolder.name}
              >
                {currentFolder.name}
              </h1>

              <p
                className="
                  text-[10px] sm:text-xs text-gray-600 mt-0.5
                  truncate
                  max-w-[160px] sm:max-w-[220px]
                "
                title={`${examName} > ${currentFolder.name}`}
              >
                {examName} &gt; {currentFolder.name}
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
          </div>
        </section>

        {/* Subfolders with Files Section */}
        {subfolders.length > 0 ? (
          <div className="space-y-6">
            {subfolders.map((subfolder) => {
              // Get files for this subfolder
              const subfolderFiles = files.filter((f) => {
                const fileFolderId = f.folderId?._id || f.folderId;
                return String(fileFolderId) === String(subfolder._id);
              });

              const subfolderSlug =
                subfolder.slug || createSlug(subfolder.name);
              const folderSlug =
                currentFolder.slug || createSlug(currentFolder.name);

              return (
                <div key={subfolder._id} className="space-y-0">
                  {/* Subfolder Name - Light Blue Header */}
                  <div className="bg-blue-100 text-gray-900 px-4 py-3 rounded-t-lg">
                    <h2 className="text-base font-bold">{subfolder.name}</h2>
                  </div>

                  {/* Files Table */}
                  {subfolderFiles.length > 0 ? (
                    <div className="bg-white border border-gray-200 border-t-0 rounded-b-lg overflow-hidden">
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <tbody>
                            {subfolderFiles.map((file, index) => (
                              <tr
                                key={file._id}
                                className={`${
                                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                } hover:bg-gray-100 transition-colors`}
                              >
                                <td className="px-4 py-3 text-sm text-gray-900">
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
                                        file.fileType === "url"
                                          ? "_blank"
                                          : "_self"
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
                                      onClick={(e) =>
                                        handleDownloadClick(e, file)
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-400 text-white text-sm font-medium rounded hover:bg-gray-500 transition-all cursor-pointer"
                                    >
                                      <FaLock className="w-3.5 h-3.5" />
                                      <span>Locked</span>
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
                                <h3 className="text-sm font-medium text-gray-900 mb-1">
                                  {file.name}
                                </h3>
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
                                  onClick={(e) => handleDownloadClick(e, file)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-400 text-white text-sm font-medium rounded hover:bg-gray-500 transition-all cursor-pointer"
                                >
                                  <FaLock className="w-3.5 h-3.5" />
                                  <span>Locked</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 border-t-0 rounded-b-lg p-8 text-center">
                      <FaFile className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        No files in this subfolder
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Files directly in folder (no subfolders) - Table Format */
          files.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    {files.map((file, index) => (
                      <tr
                        key={file._id}
                        className={`${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-gray-100 transition-colors`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
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
                              onClick={(e) => handleDownloadClick(e, file)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-400 text-white text-sm font-medium rounded hover:bg-gray-500 transition-all cursor-pointer"
                            >
                              <FaLock className="w-3.5 h-3.5" />
                              <span>Locked</span>
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
                {files.map((file, index) => (
                  <div
                    key={file._id}
                    className={`p-4 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-all"
                        >
                          <FaDownload className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      ) : (
                        <button
                          onClick={(e) => handleDownloadClick(e, file)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-400 text-white text-sm font-medium rounded hover:bg-gray-500 transition-all cursor-pointer"
                        >
                          <FaLock className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Empty State */}
        {subfolders.length === 0 && files.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FaFolder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Content Available
            </h3>
            <p className="text-sm text-gray-600">
              This folder is empty. Subfolders and files will appear here once
              they are added.
            </p>
          </div>
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

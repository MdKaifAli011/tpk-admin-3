import React from "react";
import { notFound } from "next/navigation";
import { FaDownload, FaFolder, FaSearch } from "react-icons/fa";
import Link from "next/link";
import {
  fetchExamById,
  fetchDownloadFolders,
  fetchSubfoldersByFolder,
  fetchFilesByFolder,
  createSlug,
} from "../../lib/api";
import { createSlug as createSlugUtil } from "@/utils/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DownloadPage = async ({ params }) => {
  const { exam: examIdOrSlug } = await params;

  // Fetch exam data
  const exam = await fetchExamById(examIdOrSlug);
  if (!exam) {
    notFound();
  }

  const examSlug = createSlug(exam.name);
  const examName = exam.name ? exam.name.toUpperCase() : "EXAM";

  // Fetch download folders for this exam
  let folders = [];
  try {
    folders = await fetchDownloadFolders(exam._id, {
      status: "active",
      limit: 100,
    });

    // Fetch subfolders and files count for each folder
    for (const folder of folders) {
      try {
        const subfolders = await fetchSubfoldersByFolder(folder._id, {
          status: "active",
          limit: 100,
        });
        folder.subfolderCount = subfolders.length;

        // Count files in all subfolders
        let totalFiles = 0;
        for (const subfolder of subfolders) {
          const files = await fetchFilesByFolder(subfolder._id, {
            status: "active",
            limit: 100,
          });
          totalFiles += files.length;
        }
        // Also count files directly in the folder (if any)
        const directFiles = await fetchFilesByFolder(folder._id, {
          status: "active",
          limit: 100,
        });
        totalFiles += directFiles.length;
        folder.fileCount = totalFiles;
      } catch (error) {
        folder.subfolderCount = 0;
        folder.fileCount = 0;
      }
    }
  } catch (error) {
    console.error("Error fetching download folders:", error);
    folders = [];
  }

  return (
    <div className="space-y-6">
      {/* Header Section - Matching Image Design */}
      <div className="space-y-4">
        {/* Badge */}
        <div className="inline-block px-3 py-1.5 bg-purple-100 rounded-md">
          <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
            STUDY RESOURCE LIBRARY
          </span>
        </div>

        {/* Main Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            Free Study Material for{" "}
            <span className="text-purple-600">{exam.name}</span>
          </h1>
          <p className="text-gray-600 text-base max-w-2xl">
            Get instant access to high-quality notes, question papers, and
            preparation guides. Everything you need for {exam.name} success in
            one place.
          </p>
        </div>
      </div>

      {/* Search Bar and Total Count */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search materials (e.g. Physics Notes)..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700"
          />
        </div>
        <div className="text-sm font-medium text-gray-600 whitespace-nowrap">
          Total: {folders.length} {folders.length === 1 ? "Folder" : "Folders"}
        </div>
      </div>

      {/* Folders Cards - Matching Image Design */}
      {folders.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FaFolder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Download Folders Available
          </h3>
          <p className="text-sm text-gray-600">
            Download folders will appear here once they are added.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {folders.map((folder) => {
            const folderSlug = folder.slug || createSlugUtil(folder.name);
            const subfolderCount = folder.subfolderCount || 0;
            const fileCount = folder.fileCount || 0;
            return (
              <Link
                key={folder._id}
                href={`/${examSlug}/download/${folderSlug}`}
                className="group flex-shrink-0 w-80 bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-all duration-200"
              >
                {/* Icon - Large square with dark purple background */}
                <div className="mb-4">
                  <div className="w-16 h-16 bg-purple-800 rounded-lg flex items-center justify-center shadow-sm">
                    <FaFolder className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  {folder.name}
                </h3>

                {/* Description */}
                {folder.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {folder.description}
                  </p>
                )}

                {/* Metadata - Topics and Files */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="font-medium">
                        {subfolderCount} TOPICS
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg
                        className="w-4 h-4"
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
                      <span className="font-medium">{fileCount} FILES</span>
                    </div>
                  </div>
                  {/* Right Arrow Icon */}
                  <div className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                    <svg
                      className="w-4 h-4 text-gray-600 group-hover:text-purple-600 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DownloadPage;

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaDownload, FaFolder, FaSearch, FaSpinner, FaArrowLeft } from "react-icons/fa";
import Link from "next/link";
import { createSlug } from "@/utils/slug";
import { fetchDownloadFolders } from "../../lib/api";
import Card from "../../components/Card";

const INITIAL_LIMIT = 10;
const LOAD_MORE_LIMIT = 10;

const DownloadPageClient = ({ exam, examSlug, examName }) => {
  const [folders, setFolders] = useState([]);
  const [totalFolders, setTotalFolders] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFolders = useCallback(
    async (pageNum = 1, append = false) => {
      const isLoadMore = append && pageNum > 1;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await fetchDownloadFolders(exam._id, {
          status: "active",
          limit: pageNum === 1 ? INITIAL_LIMIT : LOAD_MORE_LIMIT,
          page: pageNum,
          includeCounts: true,
          returnFullResponse: true,
        });
        const list = res?.data || [];
        const total = res?.pagination?.total ?? 0;
        if (append) setFolders((prev) => [...prev, ...list]);
        else setFolders(list);
        setTotalFolders(total);
        setPage(pageNum);
      } catch (err) {
        console.error("Failed to fetch download folders", err);
        if (!append) setFolders([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [exam._id]
  );

  useEffect(() => {
    loadFolders(1, false);
  }, [loadFolders]);

  const handleViewMore = () => loadFolders(page + 1, true);
  const hasMore = folders.length < totalFolders;

  return (
    <div className="space-y-6 bg-gray-50/80 exam-hub-min-h pb-8">
      {/* Header - matches app Card gradient + HeaderCard style */}
      <Card variant="gradient" hover={false} className="p-4 sm:p-5 min-h-[140px] hero-section">
        <Link
          href={`/${examSlug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 w-fit mb-3"
        >
          <FaArrowLeft className="w-4 h-4 shrink-0" />
          Back to {exam.name}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-900">
            Study Material & Downloads
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {examName} &gt; Study Material
          </p>
        </div>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl">
          Notes, question papers, and guides for {exam.name}. Select a folder to browse topics and files.
        </p>
      </Card>

      {/* Search + total */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search materials…"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          />
        </div>
        <div className="text-sm font-medium text-gray-600 shrink-0">
          {totalFolders} {totalFolders === 1 ? "folder" : "folders"}
        </div>
      </div>

      {/* Folders */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} variant="standard" hover={false} className="p-4 animate-pulse">
              <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3" />
              <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mt-3 pt-3 border-t border-gray-100" />
            </Card>
          ))}
        </div>
      ) : folders.length === 0 ? (
        <Card variant="standard" hover={false} className="p-12 text-center">
          <FaFolder className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No folders yet
          </h3>
          <p className="text-sm text-gray-600">
            Study material folders will appear here when they are added.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {folders.map((folder) => {
              const folderSlug = folder.slug || createSlug(folder.name);
              const subfolderCount = folder.subfolderCount ?? 0;
              const fileCount = folder.fileCount ?? 0;
              return (
                <Link
                  key={folder._id}
                  href={`/${examSlug}/download/${folderSlug}`}
                  className="group block"
                >
                  <Card
                    variant="standard"
                    hover={true}
                    className="p-4 h-full flex flex-col transition-all duration-200 group-hover:border-indigo-200"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
                        <FaFolder className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-2">
                          {folder.name}
                        </h3>
                        {folder.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {folder.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {subfolderCount} topics · {fileCount} files
                      </span>
                      <span className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                        <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleViewMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 hover:border-indigo-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>View more ({folders.length} of {totalFolders})</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DownloadPageClient;

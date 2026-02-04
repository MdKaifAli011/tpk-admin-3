"use client";

import Link from "next/link";
import { FaFolder, FaFile } from "react-icons/fa";

/**
 * Premium empty state for accordions: "No topics in this folder" or "No files in this topic".
 * Use in folder, subfolder, and file pages for consistent UX.
 */
export function EmptyTopicsState({ folderName, openHref }) {
  return (
    <div className="px-4 py-5">
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center ring-4 ring-indigo-50">
          <FaFolder className="w-6 h-6 text-indigo-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mt-4">No topics yet</h3>
        <p className="text-xs text-gray-600 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
          This folder doesn&apos;t have any topics. Open the folder to browse or check back later.
        </p>
        <Link
          href={openHref}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Open folder
        </Link>
      </div>
    </div>
  );
}

export function EmptyFilesState({ topicName, openHref }) {
  return (
    <div className="px-4 py-5">
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center ring-4 ring-amber-50">
          <FaFile className="w-6 h-6 text-amber-700" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mt-4">No files yet</h3>
        <p className="text-xs text-gray-600 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
          This topic doesn&apos;t have any files. Open the topic to add or check back later.
        </p>
        <Link
          href={openHref}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Open topic
        </Link>
      </div>
    </div>
  );
}

/** Main content empty: folder has no topics and no files. */
export function EmptyFolderContentState({ backHref }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-8 text-center shadow-sm">
      <div className="mx-auto w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center ring-4 ring-indigo-50">
        <FaFolder className="w-7 h-7 text-indigo-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mt-4">No content yet</h3>
      <p className="text-sm text-gray-600 mt-2 max-w-[280px] mx-auto leading-relaxed">
        Topics and files will appear here once they are added.
      </p>
      {backHref && (
        <Link
          href={backHref}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Back to Study Material
        </Link>
      )}
    </div>
  );
}

/** Main content empty: current topic has no files. */
export function EmptyTopicFilesMainState({ folderName, backHref }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 p-8 text-center shadow-sm">
      <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center ring-4 ring-amber-50">
        <FaFile className="w-7 h-7 text-amber-700" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mt-4">No files yet</h3>
      <p className="text-sm text-gray-600 mt-2 max-w-[280px] mx-auto leading-relaxed">
        Files will appear here once they are added to this topic.
      </p>
      {backHref && (
        <Link
          href={backHref}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Back to {folderName || "folder"}
        </Link>
      )}
    </div>
  );
}

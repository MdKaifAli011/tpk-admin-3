import React from "react";
import { notFound } from "next/navigation";
import { FaDownload, FaFile, FaLink, FaLock } from "react-icons/fa";
import Link from "next/link";
import {
  fetchExamById,
  fetchDownloadFolders,
  fetchDownloadFolderById,
  fetchSubfoldersByFolder,
  fetchFilesByFolder,
  createSlug,
} from "../../../lib/api";
import { createSlug as createSlugUtil } from "@/utils/slug";
import DownloadFolderPageClient from "./DownloadFolderPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DownloadFolderPage = async ({ params }) => {
  const { exam: examIdOrSlug, folder: folderIdOrSlug } = await params;

  // Fetch exam data
  const exam = await fetchExamById(examIdOrSlug);
  if (!exam) {
    notFound();
  }

  const examSlug = createSlug(exam.name);
  const examName = exam.name ? exam.name.toUpperCase() : "EXAM";

  // Fetch all folders with counts so we can hide empty folders in accordion
  const allFolders = await fetchDownloadFolders(exam._id, {
    status: "active",
    limit: 100,
    includeCounts: true,
  });

  // Find current folder by ID or slug
  let currentFolder = null;
  if (/^[0-9a-fA-F]{24}$/.test(folderIdOrSlug)) {
    currentFolder = allFolders.find((f) => f._id === folderIdOrSlug);
  } else {
    currentFolder = allFolders.find(
      (f) => f.slug === folderIdOrSlug || createSlugUtil(f.name) === folderIdOrSlug
    );
  }

  if (!currentFolder) {
    notFound();
  }

  // Fetch first 10 subfolders that have at least one file (View more loads 10 more on client)
  const subfoldersRes = await fetchSubfoldersByFolder(currentFolder._id, {
    status: "active",
    limit: 10,
    page: 1,
    onlyWithFiles: true,
    returnFullResponse: true,
  });
  const subfolders = subfoldersRes?.data || [];
  const totalSubfolders = subfoldersRes?.pagination?.total ?? subfolders.length;

  // Fetch first 10 files per subfolder (with total for "View more"), or all files if no subfolders
  let files = [];
  let filesBySubfolder = {}; // { subfolderId: { files: [], total } }
  if (subfolders.length > 0) {
    const results = await Promise.all(
      subfolders.map(async (sf) => {
        const result = await fetchFilesByFolder(sf._id, {
          status: "active",
          limit: 10,
          page: 1,
          returnFullResponse: true,
        });
        const list = result?.data || [];
        const total = result?.pagination?.total ?? list.length;
        return {
          subfolderId: sf._id,
          files: list.map((f) => ({
            ...f,
            folderId: f.folderId?._id || f.folderId,
          })),
          total,
        };
      })
    );
    results.forEach(({ subfolderId, files: list, total }) => {
      filesBySubfolder[String(subfolderId)] = { files: list, total };
    });
    files = results.flatMap((r) => r.files);
  } else {
    const result = await fetchFilesByFolder(currentFolder._id, {
      status: "active",
      limit: 10,
      page: 1,
      returnFullResponse: true,
    });
    const list = result?.data || [];
    const total = result?.pagination?.total ?? list.length;
    files = list.map((f) => ({
      ...f,
      folderId: f.folderId?._id || f.folderId,
    }));
    filesBySubfolder.direct = { files, total };
  }

  return (
    <DownloadFolderPageClient
      exam={exam}
      examSlug={examSlug}
      examName={examName}
      currentFolder={currentFolder}
      allFolders={allFolders}
      subfolders={subfolders}
      totalSubfolders={totalSubfolders}
      files={files}
      filesBySubfolder={filesBySubfolder}
    />
  );
};

export default DownloadFolderPage;


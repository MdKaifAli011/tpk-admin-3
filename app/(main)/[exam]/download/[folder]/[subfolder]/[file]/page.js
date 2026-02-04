import React from "react";
import { notFound } from "next/navigation";
import {
  fetchExamById,
  fetchDownloadFolders,
  fetchSubfoldersByFolder,
  fetchFilesByFolder,
  createSlug,
} from "../../../../../lib/api";
import { createSlug as createSlugUtil } from "@/utils/slug";
import DownloadFilePageClient from "./DownloadFilePageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Single file page: /{examSlug}/download/{folderSlug}/{subfolderSlug}/{fileSlug}
 * Shows only this file (name, description, download).
 */
const DownloadFilePage = async ({ params }) => {
  const { exam: examIdOrSlug, folder: folderIdOrSlug, subfolder: subfolderIdOrSlug, file: fileIdOrSlug } = await params;

  const exam = await fetchExamById(examIdOrSlug);
  if (!exam) notFound();

  const examSlug = createSlug(exam.name);
  const examName = exam.name ? exam.name.toUpperCase() : "EXAM";

  const allFolders = await fetchDownloadFolders(exam._id, { status: "active", limit: 100, includeCounts: true });
  let currentFolder = null;
  if (/^[0-9a-fA-F]{24}$/.test(folderIdOrSlug)) {
    currentFolder = allFolders.find((f) => f._id === folderIdOrSlug);
  } else {
    currentFolder = allFolders.find(
      (f) => f.slug === folderIdOrSlug || createSlugUtil(f.name) === folderIdOrSlug
    );
  }
  if (!currentFolder) notFound();

  const allSubfolders = await fetchSubfoldersByFolder(currentFolder._id, { status: "active", limit: 100 });
  let currentSubfolder = null;
  if (/^[0-9a-fA-F]{24}$/.test(subfolderIdOrSlug)) {
    currentSubfolder = allSubfolders.find((sf) => sf._id === subfolderIdOrSlug);
  } else {
    currentSubfolder = allSubfolders.find(
      (sf) => sf.slug === subfolderIdOrSlug || createSlugUtil(sf.name) === subfolderIdOrSlug
    );
  }
  if (!currentSubfolder) notFound();

  const subfolders = await fetchSubfoldersByFolder(currentFolder._id, {
    status: "active",
    limit: 100,
    onlyWithFiles: true,
  });

  const files = await fetchFilesByFolder(currentSubfolder._id, { status: "active", limit: 100 });
  let currentFile = null;
  if (/^[0-9a-fA-F]{24}$/.test(fileIdOrSlug)) {
    currentFile = files.find((f) => f._id === fileIdOrSlug);
  } else {
    currentFile = files.find(
      (f) => (f.slug || createSlugUtil(f.name)) === fileIdOrSlug
    );
  }
  if (!currentFile) notFound();

  return (
    <DownloadFilePageClient
      exam={exam}
      examSlug={examSlug}
      examName={examName}
      currentFolder={currentFolder}
      currentSubfolder={currentSubfolder}
      file={currentFile}
      files={files}
      allFolders={allFolders}
      subfolders={subfolders}
    />
  );
};

export default DownloadFilePage;

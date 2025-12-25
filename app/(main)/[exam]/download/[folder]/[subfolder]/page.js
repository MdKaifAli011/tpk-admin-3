import React from "react";
import { notFound } from "next/navigation";
import {
  fetchExamById,
  fetchDownloadFolders,
  fetchSubfoldersByFolder,
  fetchFilesByFolder,
  createSlug,
} from "../../../../lib/api";
import { createSlug as createSlugUtil } from "@/utils/slug";
import DownloadSubfolderPageClient from "./DownloadSubfolderPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DownloadSubfolderPage = async ({ params }) => {
  const { exam: examIdOrSlug, folder: folderIdOrSlug, subfolder: subfolderIdOrSlug } = await params;

  // Fetch exam data
  const exam = await fetchExamById(examIdOrSlug);
  if (!exam) {
    notFound();
  }

  const examSlug = createSlug(exam.name);
  const examName = exam.name ? exam.name.toUpperCase() : "EXAM";

  // Fetch all folders to find the current folder
  const allFolders = await fetchDownloadFolders(exam._id, {
    status: "active",
    limit: 100,
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

  // Fetch subfolders for this folder
  const subfolders = await fetchSubfoldersByFolder(currentFolder._id, {
    status: "active",
    limit: 100,
  });

  // Find current subfolder by ID or slug
  let currentSubfolder = null;
  if (/^[0-9a-fA-F]{24}$/.test(subfolderIdOrSlug)) {
    currentSubfolder = subfolders.find((sf) => sf._id === subfolderIdOrSlug);
  } else {
    currentSubfolder = subfolders.find(
      (sf) => sf.slug === subfolderIdOrSlug || createSlugUtil(sf.name) === subfolderIdOrSlug
    );
  }

  if (!currentSubfolder) {
    notFound();
  }

  // Fetch files for this subfolder
  const files = await fetchFilesByFolder(currentSubfolder._id, {
    status: "active",
    limit: 100,
  });

  return (
    <DownloadSubfolderPageClient
      exam={exam}
      examSlug={examSlug}
      examName={examName}
      currentFolder={currentFolder}
      currentSubfolder={currentSubfolder}
      allFolders={allFolders}
      subfolders={subfolders}
      files={files}
    />
  );
};

export default DownloadSubfolderPage;


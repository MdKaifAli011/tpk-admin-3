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

  // Fetch all folders to find the current folder and allow switching
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

  // Fetch subfolders
  const subfolders = await fetchSubfoldersByFolder(currentFolder._id, {
    status: "active",
    limit: 100,
  });

  // Fetch files for each subfolder, or files directly in folder if no subfolders
  let files = [];
  if (subfolders.length > 0) {
    // If there are subfolders, fetch files for each subfolder
    const subfolderIds = subfolders.map((sf) => sf._id);
    const allFilesArrays = await Promise.all(
      subfolderIds.map((subfolderId) =>
        fetchFilesByFolder(subfolderId, {
          status: "active",
          limit: 100,
        })
      )
    );
    // Flatten and ensure folderId is set correctly
    files = allFilesArrays.flat().map((file) => ({
      ...file,
      folderId: file.folderId?._id || file.folderId,
    }));
  } else {
    // If no subfolders, fetch files directly in the folder
    const directFiles = await fetchFilesByFolder(currentFolder._id, {
      status: "active",
      limit: 100,
    });
    files = directFiles.map((file) => ({
      ...file,
      folderId: file.folderId?._id || file.folderId,
    }));
  }

  return (
    <DownloadFolderPageClient
      exam={exam}
      examSlug={examSlug}
      examName={examName}
      currentFolder={currentFolder}
      allFolders={allFolders}
      subfolders={subfolders}
      files={files}
    />
  );
};

export default DownloadFolderPage;


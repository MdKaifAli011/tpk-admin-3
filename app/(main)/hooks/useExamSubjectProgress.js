"use client";

import { useState, useEffect, useCallback } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/**
 * Fetches exam-level progress and per-subject progress for the Preparation Progress dashboard.
 * Returns { overallPercent, subjectProgressList, isLoading, error, refetch }.
 * subjectProgressList: [{ subjectId, subjectName, progress, weakArea? }]
 */
export function useExamSubjectProgress(examId, subjectsWithUnits = []) {
  const [overallPercent, setOverallPercent] = useState(0);
  const [subjectProgressList, setSubjectProgressList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!examId) {
      setOverallPercent(0);
      setSubjectProgressList([]);
      setIsLoading(false);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
    if (!token) {
      setOverallPercent(0);
      setSubjectProgressList(
        (subjectsWithUnits || []).map((s) => ({
          subjectId: s._id,
          subjectName: s.name,
          progress: 0,
          weakArea: "—",
        }))
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const examRes = await fetch(
        `${basePath}/api/student/progress/exam?examId=${examId}`,
        { headers }
      );
      const examData = await examRes.json();
      const totalProgress = examData.success && examData.data?.examProgress != null
        ? Math.min(100, Math.max(0, examData.data.examProgress))
        : 0;
      setOverallPercent(totalProgress);

      const subjects = subjectsWithUnits && subjectsWithUnits.length > 0
        ? subjectsWithUnits
        : [];
      const subjectPromises = subjects.map(async (subject) => {
        try {
          const res = await fetch(
            `${basePath}/api/student/progress/subject?subjectId=${subject._id}`,
            { headers }
          );
          const data = await res.json();
          const progress = data.success && data.data?.subjectProgress != null
            ? Math.min(100, Math.max(0, data.data.subjectProgress))
            : 0;
          const weakArea = getWeakAreaPlaceholder(subject.name);
          return {
            subjectId: subject._id,
            subjectName: subject.name,
            progress,
            weakArea,
          };
        } catch (e) {
          return {
            subjectId: subject._id,
            subjectName: subject.name,
            progress: 0,
            weakArea: getWeakAreaPlaceholder(subject.name),
          };
        }
      });

      const list = await Promise.all(subjectPromises);
      setSubjectProgressList(list);
    } catch (err) {
      setError(err.message || "Failed to load progress");
      setOverallPercent(0);
      setSubjectProgressList(
        (subjectsWithUnits || []).map((s) => ({
          subjectId: s._id,
          subjectName: s.name,
          progress: 0,
          weakArea: "—",
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [examId, subjectsWithUnits]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    const handleUpdate = () => fetchProgress();
    window.addEventListener("progress-updated", handleUpdate);
    window.addEventListener("chapterProgressUpdate", handleUpdate);
    return () => {
      window.removeEventListener("progress-updated", handleUpdate);
      window.removeEventListener("chapterProgressUpdate", handleUpdate);
    };
  }, [fetchProgress]);

  return {
    overallPercent,
    subjectProgressList,
    isLoading,
    error,
    refetch: fetchProgress,
  };
}

function getWeakAreaPlaceholder(subjectName) {
  const m = {
    Physics: "Numericals",
    Chemistry: "Inorganic",
    Biology: "Statement Traps",
  };
  return m[subjectName] || "—";
}

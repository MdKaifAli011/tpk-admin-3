"use client";

import { useState, useEffect, useCallback } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/**
 * Fetches exam-level progress (theory 70% + practice 30%) and per-subject progress.
 * Subjects with practiceDisabled are excluded. overallPercent = combined (70/30).
 * Returns { overallPercent, theoryPercent, practicePercent, subjectProgressList, isLoading, error, refetch }.
 */
export function useExamSubjectProgress(examId, subjectsWithUnits = []) {
  const [overallPercent, setOverallPercent] = useState(0);
  const [theoryPercent, setTheoryPercent] = useState(0);
  const [practicePercent, setPracticePercent] = useState(0);
  const [subjectProgressList, setSubjectProgressList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!examId) {
      setTheoryPercent(0);
      setPracticePercent(0);
      setOverallPercent(0);
      setSubjectProgressList([]);
      setIsLoading(false);
      return;
    }

    // Only count and show subjects that do not have practice disabled
    const subjectsForProgress = (subjectsWithUnits || []).filter(
      (s) => s.practiceDisabled !== true
    );

    const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
    if (!token) {
      setTheoryPercent(0);
      setPracticePercent(0);
      setOverallPercent(0);
      setSubjectProgressList(
        subjectsForProgress.map((s) => ({
          subjectId: s._id,
          subjectName: s.name,
          progress: 0,
          weakArea: getWeakAreaPlaceholder(s.name),
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
      const data = examData.success ? examData.data : null;
      const theory = data?.examProgress != null ? Math.min(100, Math.max(0, data.examProgress)) : 0;
      const practice = data?.practiceProgress != null ? Math.min(100, Math.max(0, data.practiceProgress)) : 0;
      const combined = data?.combinedProgress != null ? Math.min(100, Math.max(0, data.combinedProgress)) : theory;
      setTheoryPercent(theory);
      setPracticePercent(practice);
      setOverallPercent(combined);

      const subjects = subjectsForProgress.length > 0 ? subjectsForProgress : [];
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
      const fallbackList = (subjectsWithUnits || []).filter(
        (s) => s.practiceDisabled !== true
      );
      setError(err.message || "Failed to load progress");
      setTheoryPercent(0);
      setPracticePercent(0);
      setOverallPercent(0);
      setSubjectProgressList(
        fallbackList.map((s) => ({
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
    theoryPercent,
    practicePercent,
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

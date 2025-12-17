/**
 * Utility functions for managing congratulations modal state in database
 * Replaces localStorage-based tracking
 */

// Base path - should match next.config.mjs basePath
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

/**
 * Check if congratulations has been shown for a chapter
 */
export async function checkChapterCongratulationsShown(chapterId, unitId) {
  try {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("student_token");
    if (!token) return false;

    const response = await fetch(`${basePath}/api/student/progress?unitId=${unitId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const progressDoc = data.data[0];
        const chapterProgress = progressDoc.progress?.[chapterId];
        return chapterProgress?.congratulationsShown || false;
      }
    }
  } catch (error) {
    console.error("Error checking chapter congratulations:", error);
  }
  return false;
}

/**
 * Mark congratulations as shown for a chapter
 */
export async function markChapterCongratulationsShown(chapterId, unitId) {
  try {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("student_token");
    if (!token) return false;

    const response = await fetch(`${basePath}/api/student/progress/mark-congratulations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "chapter",
        unitId,
        chapterId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.success || false;
    }
  } catch (error) {
    console.error("Error marking chapter congratulations:", error);
  }
  return false;
}

/**
 * Check if congratulations has been shown for a unit
 */
export async function checkUnitCongratulationsShown(unitId) {
  try {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("student_token");
    if (!token) return false;

    const response = await fetch(`${basePath}/api/student/progress?unitId=${unitId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const progressDoc = data.data[0];
        return progressDoc.unitCongratulationsShown || false;
      }
    }
  } catch (error) {
    console.error("Error checking unit congratulations:", error);
  }
  return false;
}

/**
 * Mark congratulations as shown for a unit
 */
export async function markUnitCongratulationsShown(unitId) {
  try {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("student_token");
    if (!token) return false;

    const response = await fetch(`${basePath}/api/student/progress/mark-congratulations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "unit",
        unitId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.success || false;
    }
  } catch (error) {
    console.error("Error marking unit congratulations:", error);
  }
  return false;
}

/**
 * Check if congratulations has been shown for a subject
 */
export async function checkSubjectCongratulationsShown(subjectId) {
  try {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("student_token");
    if (!token) return false;

    const response = await fetch(
      `${basePath}/api/student/progress/subject?subjectId=${subjectId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data.subjectCongratulationsShown || false;
      }
    }
  } catch (error) {
    console.error("Error checking subject congratulations:", error);
  }
  return false;
}

/**
 * Mark congratulations as shown for a subject
 */
export async function markSubjectCongratulationsShown(subjectId) {
  try {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("student_token");
    if (!token) return false;

    const response = await fetch(`${basePath}/api/student/progress/mark-congratulations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "subject",
        subjectId,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.success || false;
    }
  } catch (error) {
    console.error("Error marking subject congratulations:", error);
  }
  return false;
}

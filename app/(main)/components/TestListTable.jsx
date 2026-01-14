"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchPracticeTests, fetchPracticeCategories, fetchStudentTestResults } from "../lib/api";
import Card from "./Card";
import LoadingState from "./LoadingState";
import Button from "./Button";
import { useStudent } from "../hooks/useStudent";
import {
    FaFileAlt,
    FaTimesCircle,
    FaEye,
} from "react-icons/fa";
import { toTitleCase } from "../../../utils/titleCase";

// Default test settings if not provided by admin
const DEFAULT_MARKS_PER_QUESTION = 4;

const TestListTable = ({
    examId,
    subjectId,
    unitId,
    chapterId,
    topicId,
    subTopicId,
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated: isAuthFromHook } = useStudent();
    const [tests, setTests] = useState([]);
    const [groupedData, setGroupedData] = useState([]); // Grouped by category
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [studentScores, setStudentScores] = useState({}); // testId -> best score

    // Sync authentication state from useStudent hook
    useEffect(() => {
        setIsAuthenticated(isAuthFromHook);
    }, [isAuthFromHook]);

    // Listen for storage changes and login events to refresh scores
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === "student_token") {
                const token = localStorage.getItem("student_token");
                if (token && !isAuthenticated) {
                    setIsAuthenticated(true);
                    if (tests.length > 0) {
                        setTimeout(() => {
                            fetchStudentScores();
                        }, 300);
                    }
                } else if (!token && isAuthenticated) {
                    setIsAuthenticated(false);
                    setStudentScores({});
                }
            }
        };

        const handleLoginEvent = () => {
            const token = localStorage.getItem("student_token");
            if (token) {
                setIsAuthenticated(true);
                if (tests.length > 0) {
                    setTimeout(() => {
                        fetchStudentScores();
                    }, 300);
                }
            }
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("student-login", handleLoginEvent);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("student-login", handleLoginEvent);
        };
    }, [isAuthenticated, tests.length]);

    // Fetch student scores when authenticated and tests are loaded
    const fetchStudentScores = useCallback(async (testsToFetch) => {
        const testsArray = testsToFetch || tests;
        if (!isAuthenticated || testsArray.length === 0) {
            setStudentScores({});
            return;
        }

        try {
            const scorePromises = testsArray.map(async (test) => {
                const testId = String(test._id || test.id);
                if (!testId || testId === "undefined" || testId === "null") {
                    return null;
                }
                try {
                    const result = await fetchStudentTestResults(testId);
                    if (result && result.totalMarks !== undefined) {
                        return {
                            testId,
                            score: {
                                totalMarks: result.totalMarks,
                                maximumMarks: result.maximumMarks,
                                percentage: result.percentage,
                            },
                        };
                    }
                } catch (error) {
                    // Silently fail for individual test
                }
                return null;
            });

            const results = await Promise.all(scorePromises);
            const scoresMap = {};
            results.forEach((item) => {
                if (item) {
                    scoresMap[item.testId] = item.score;
                }
            });

            setStudentScores(scoresMap);
        } catch (error) {
            // Silently fail
        }
    }, [isAuthenticated]); // Removed tests from dependencies to prevent loops

    // Fetch scores when authenticated and tests change
    useEffect(() => {
        if (isAuthenticated && tests.length > 0) {
            const timer = setTimeout(() => {
                fetchStudentScores(tests);
            }, 200);
            return () => clearTimeout(timer);
        } else {
            setStudentScores({});
        }
    }, [isAuthenticated, tests.length, fetchStudentScores]);

    // Refresh scores when tab becomes active
    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "practice" && isAuthenticated && tests.length > 0) {
            const timer = setTimeout(() => {
                fetchStudentScores(tests);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchParams, isAuthenticated, tests.length, fetchStudentScores]);

    useEffect(() => {
        const loadTests = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch categories first (like PracticeTestList does)
                const categoryFilters = {
                    examId,
                    subjectId,
                    status: "active",
                };
                const cleanCategoryFilters = {};
                Object.keys(categoryFilters).forEach((key) => {
                    if (categoryFilters[key] !== null && categoryFilters[key] !== undefined) {
                        cleanCategoryFilters[key] = categoryFilters[key];
                    }
                });
                const categories = await fetchPracticeCategories(cleanCategoryFilters);

                // Fetch ALL tests for the subject by fetching tests for each category
                // This gets all tests across all hierarchy levels
                const allTests = [];
                for (const category of categories) {
                    const categoryId = category._id || category.id;
                    if (categoryId) {
                        const testFilters = {
                            categoryId,
                            status: "active",
                        };
                        const categoryTests = await fetchPracticeTests(testFilters);
                        if (categoryTests && categoryTests.length > 0) {
                            allTests.push(...categoryTests);
                        }
                    }
                }

                const fetchedTests = allTests;

                // Process tests with enriched data
                const processedTests = (fetchedTests || []).map((test) => {
                    const qCount = test.numberOfQuestions || test.totalQuestions || test.questionCount || 0;
                    return {
                        ...test,
                        numberOfQuestions: qCount,
                        maximumMarks: test.maximumMarks || test.totalMarks || (qCount * DEFAULT_MARKS_PER_QUESTION),
                        duration: test.duration || "N/A",
                    };
                });

                setTests(processedTests);

                // Group tests by category
                const categoryMap = new Map();
                processedTests.forEach((test) => {
                    // Get category ID and name
                    let categoryId = null;
                    let categoryName = "Available Tests"; // Default fallback

                    if (test.categoryId) {
                        if (typeof test.categoryId === "object") {
                            categoryId = test.categoryId._id || test.categoryId.id;
                            categoryName = test.categoryId.name || categoryName;
                        } else {
                            categoryId = test.categoryId;
                        }
                    }

                    // Use categoryId as key, or "uncategorized" if no category
                    const key = categoryId ? String(categoryId) : "uncategorized";

                    if (!categoryMap.has(key)) {
                        categoryMap.set(key, {
                            category: {
                                _id: categoryId,
                                name: categoryName,
                            },
                            tests: [],
                        });
                    }

                    categoryMap.get(key).tests.push(test);
                });

                // Helper function to determine if a test is assigned to the current page level
                // Matches the logic from PracticeTestList
                const isAssignedToCurrentLevel = (test) => {
                    // Extract test IDs (handle both object and string formats)
                    const tUnitId = test.unitId ? (test.unitId._id || test.unitId.id || test.unitId) : null;
                    const tChapterId = test.chapterId ? (test.chapterId._id || test.chapterId.id || test.chapterId) : null;
                    const tTopicId = test.topicId ? (test.topicId._id || test.topicId.id || test.topicId) : null;
                    const tSubTopicId = test.subTopicId ? (test.subTopicId._id || test.subTopicId.id || test.subTopicId) : null;
                    const tSubjectId = test.subjectId ? (test.subjectId._id || test.subjectId.id || test.subjectId) : null;

                    // Convert to strings for comparison (normalize)
                    const sUnitId = unitId ? String(unitId).trim() : null;
                    const sChapterId = chapterId ? String(chapterId).trim() : null;
                    const sTopicId = topicId ? String(topicId).trim() : null;
                    const sSubTopicId = subTopicId ? String(subTopicId).trim() : null;
                    const sSubjectId = subjectId ? String(subjectId).trim() : null;

                    // Convert test IDs to strings for comparison (normalize)
                    const testUnitId = tUnitId ? String(tUnitId).trim() : null;
                    const testChapterId = tChapterId ? String(tChapterId).trim() : null;
                    const testTopicId = tTopicId ? String(tTopicId).trim() : null;
                    const testSubTopicId = tSubTopicId ? String(tSubTopicId).trim() : null;
                    const testSubjectId = tSubjectId ? String(tSubjectId).trim() : null;

                    // Check if test is assigned to current page level
                    // Priority: subtopic > topic > chapter > unit > subject
                    // A test is "assigned" if it matches the current page level
                    if (sSubTopicId && testSubTopicId && testSubTopicId === sSubTopicId) {
                        return true;
                    } else if (sTopicId && !sSubTopicId && testTopicId && testTopicId === sTopicId) {
                        return true;
                    } else if (sChapterId && !sTopicId && !sSubTopicId && testChapterId && testChapterId === sChapterId) {
                        return true;
                    } else if (sUnitId && !sChapterId && !sTopicId && !sSubTopicId && testUnitId && testUnitId === sUnitId) {
                        return true;
                    } else if (sSubjectId && !sUnitId && !sChapterId && !sTopicId && !sSubTopicId && testSubjectId && testSubjectId === sSubjectId) {
                        return true;
                    }
                    return false;
                };

                // Convert map to array and sort tests within each group
                const grouped = Array.from(categoryMap.values()).map((group) => ({
                    ...group,
                    tests: group.tests.sort((a, b) => {
                        // Primary sort: Assigned tests first (priority 1), then others (priority 2)
                        const aIsAssigned = isAssignedToCurrentLevel(a) ? 1 : 2;
                        const bIsAssigned = isAssignedToCurrentLevel(b) ? 1 : 2;

                        if (aIsAssigned !== bIsAssigned) {
                            return aIsAssigned - bIsAssigned;
                        }

                        // Secondary sort: OrderNumber if available
                        const aOrder = a.orderNumber || 999;
                        const bOrder = b.orderNumber || 999;
                        return aOrder - bOrder;
                    }),
                }));

                setGroupedData(grouped);

                // Fetch scores after tests are loaded (if authenticated)
                // Use processedTests directly to avoid dependency on tests state
                if (typeof window !== "undefined") {
                    const token = localStorage.getItem("student_token");
                    const isAuth = token || isAuthenticated;
                    if (isAuth && processedTests.length > 0) {
                        setTimeout(() => {
                            fetchStudentScores(processedTests);
                        }, 100);
                    }
                }
            } catch (err) {
                console.error("Error loading tests:", err);
                setError("Failed to load tests. Please try again.");
                setTests([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadTests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [examId, subjectId, unitId, chapterId, topicId, subTopicId]);

    const handleOpenTest = (test) => {
        const testSlug = test.slug || test._id || test.id;
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", "practice");
        params.set("test", testSlug);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleViewResult = (test) => {
        const testSlug = test.slug || test._id || test.id;
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", "practice");
        params.set("test", testSlug);
        params.set("view", "results");
        router.push(`?${params.toString()}`, { scroll: false });
    };

    // Helper function to render formatted names
    const renderFormattedName = (name) => {
        if (!name) return "";
        // If it contains HTML tags, render as is
        if (/<[a-z][\s\S]*>/i.test(name)) {
            return name;
        }
        // Otherwise apply title case
        return toTitleCase(name);
    };

    if (isLoading) {
        return (
            <Card variant="standard" className="p-4 sm:p-6">
                <div className="flex items-center justify-center py-8">
                    <LoadingState message="Loading tests..." />
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card variant="standard" className="p-4 sm:p-6">
                <div className="text-center py-8">
                    <FaTimesCircle className="text-red-500 text-2xl mx-auto mb-2" />
                    <p className="text-sm text-gray-600">{error}</p>
                </div>
            </Card>
        );
    }

    if (tests.length === 0) {
        return (
            <Card variant="standard" className="p-4 sm:p-6">
                <div className="text-center py-8">
                    <FaFileAlt className="text-gray-400 text-3xl mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">No tests available</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Tests will appear here when they are added for this content.
                    </p>
                </div>
            </Card>
        );
    }

    // If no grouped data, return empty (shouldn't happen, but safety check)
    if (groupedData.length === 0) {
        return null;
    }

    return (
        <Card variant="standard" hover={true} className="space-y-4 overflow-hidden border-none">
            {groupedData.map((group, groupIndex) => (
                <div key={groupIndex} >
                    {/* TABLE FOR DESKTOP */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full table-fixed">
                            {/* FIXED HEADER */}
                            <thead className="bg-blue-50 border-b border-gray-200">
                                <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    {/* Column 1 */}
                                    <th className="px-4 py-3 text-left w-[28%] text-sm text-blue-900">
                                        {renderFormattedName(group.category.name)}
                                    </th>

                                    {/* Column 2 */}
                                    <th className="px-3 py-3 text-center w-[10%]">Questions</th>

                                    {/* Column 3 */}
                                    <th className="px-3 py-3 text-center w-[12%]">Max. Marks</th>

                                    {/* Column 4 */}
                                    <th className="px-3 py-3 text-center w-[12%]">Duration</th>

                                    {/* Column 5 */}
                                    <th className="px-3 py-3 text-center w-[12%]">Attempted</th>

                                    {/* Column 6 */}
                                    <th className="px-3 py-3 text-right w-[13%]">Practice</th>

                                    {/* Column 7 */}
                                    <th className="px-4 py-3 text-right w-[13%]">My Score</th>
                                </tr>
                            </thead>

                            {/* BODY */}
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {group.tests.map((test, i) => {
                                    const testId = String(test._id || test.id);
                                    const score = studentScores[testId];
                                    const hasAttempted =
                                        score &&
                                        score.totalMarks !== undefined &&
                                        score.totalMarks !== null &&
                                        !isNaN(score.totalMarks);
                                    const hasScore =
                                        hasAttempted &&
                                        score.maximumMarks !== undefined &&
                                        score.maximumMarks !== null;

                                    return (
                                        <tr key={test._id || test.id || i} className="hover:bg-gray-50 transition-all">
                                            {/* Col 1 */}
                                            <td className="px-4 py-3 w-[28%]">
                                                <div className="text-sm font-medium text-gray-900 flex">
                                                    {test.orderNumber && <span className="mr-1">{test.orderNumber}.</span>}
                                                    <span dangerouslySetInnerHTML={{ __html: renderFormattedName(test.name || test.title || "Untitled Test") }} />
                                                </div>
                                            </td>

                                            {/* Col 2 */}
                                            <td className="px-3 py-3 text-center text-sm text-gray-700 w-[10%]">
                                                {test.numberOfQuestions || 0}
                                            </td>

                                            {/* Col 3 */}
                                            <td className="px-3 py-3 text-center text-sm text-gray-700 w-[12%]">
                                                {test.maximumMarks || 0}
                                            </td>

                                            {/* Col 4 */}
                                            <td className="px-3 py-3 text-center text-sm text-gray-700 w-[12%]">
                                                {test.duration || "N/A"}
                                            </td>

                                            {/* Col 5 - Attempted */}
                                            <td className="px-3 py-3 text-center text-sm w-[12%]">
                                                {hasAttempted ? (
                                                    <span className="text-green-600 font-medium">Attempted</span>
                                                ) : (
                                                    <span className="text-gray-500">–</span>
                                                )}
                                            </td>

                                            {/* Col 6 */}
                                            <td className="px-3 py-3 text-right w-[13%]">
                                                <div className="flex items-center justify-end gap-2">
                                                    {hasScore && isAuthenticated && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewResult(test)}
                                                            className="flex items-center gap-1"
                                                        >
                                                            View
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleOpenTest(test)}
                                                        className={
                                                            hasScore
                                                                ? "bg-emerald-600 hover:bg-emerald-700"
                                                                : ""
                                                        }
                                                    >
                                                        {hasScore ? "Retake" : "Start"}
                                                    </Button>
                                                </div>
                                            </td>

                                            {/* Col 7 - My Score */}
                                            <td className="px-4 py-3 text-right w-[13%]">
                                                {hasScore ? (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-indigo-600 font-semibold text-sm">
                                                            {parseFloat(score.totalMarks).toFixed(1)}/
                                                            {score.maximumMarks}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {parseFloat(score.percentage || 0).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-sm">NA</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden divide-y divide-gray-200">
                        {group.tests.map((test, i) => {
                            const testId = String(test._id || test.id);
                            const score = studentScores[testId];
                            const hasAttempted =
                                score &&
                                score.totalMarks !== undefined &&
                                score.totalMarks !== null &&
                                !isNaN(score.totalMarks);
                            const hasScore =
                                hasAttempted &&
                                score.maximumMarks !== undefined &&
                                score.maximumMarks !== null;

                            return (
                                <div key={test._id || test.id || i} className="px-4 py-4">
                                    {/* Show category name ONLY for the first test */}
                                    {i === 0 && (
                                        <div
                                            className="text-sm font-bold text-blue-900 mb-3"
                                            dangerouslySetInnerHTML={{ __html: renderFormattedName(group.category.name) }}
                                        />
                                    )}

                                    {/* Test Name */}
                                    <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                        {test.orderNumber && <span className="mr-1">{test.orderNumber}.</span>}
                                        <span dangerouslySetInnerHTML={{ __html: renderFormattedName(test.name || test.title || "Untitled Test") }} />
                                    </div>

                                    {/* Details */}
                                    <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-gray-700">
                                        <div>Questions: {test.numberOfQuestions || 0}</div>
                                        <div>Marks: {test.maximumMarks || 0}</div>
                                        <div>Duration: {test.duration || "N/A"}</div>
                                        <div>
                                            Attempted: {hasAttempted ? (
                                                <span className="text-green-600 font-medium">Attempted</span>
                                            ) : (
                                                <span className="text-gray-500">–</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Button + Score */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleOpenTest(test)}
                                                className={
                                                    hasScore ? "bg-emerald-600 hover:bg-emerald-700" : ""
                                                }
                                            >
                                                {hasScore ? "Retake" : "Start"}
                                            </Button>
                                        </div>

                                        {hasScore ? (
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold text-indigo-600">
                                                        {parseFloat(score.totalMarks).toFixed(1)}/
                                                        {score.maximumMarks}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {parseFloat(score.percentage || 0).toFixed(1)}%
                                                    </div>
                                                </div>
                                                {isAuthenticated && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewResult(test)}
                                                        className="flex items-center gap-1.5 text-xs px-2 py-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                                                    >
                                                        <FaEye className="text-xs" />
                                                        View Result
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500">NA</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </Card>
    );
};

export default TestListTable;

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

    // Scroll to top when test parameter appears in URL (when student starts a test)
    useEffect(() => {
        const testParam = searchParams.get("test");
        const tabParam = searchParams.get("tab");

        // Only scroll if we're on the practice tab and a test is selected
        if (testParam && tabParam === "practice") {
            // Multiple scroll attempts with delays to handle async rendering
            const scrollToTop = () => {
                if (typeof window !== "undefined") {
                    // Immediate scroll
                    window.scrollTo({ top: 0, behavior: 'auto' });
                    if (document.documentElement) {
                        document.documentElement.scrollTop = 0;
                    }
                    if (document.body) {
                        document.body.scrollTop = 0;
                    }
                }
            };

            // Scroll immediately
            scrollToTop();

            // Scroll after short delay (for DOM updates)
            const timer1 = setTimeout(scrollToTop, 100);

            // Scroll after medium delay (for component rendering)
            const timer2 = setTimeout(() => {
                scrollToTop();
                // Also try smooth scroll
                if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 300);

            // Final scroll attempt (for slow rendering)
            const timer3 = setTimeout(scrollToTop, 500);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [searchParams]);

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

                // Handle case where categories fetch fails or returns empty
                if (!categories || !Array.isArray(categories)) {
                    if (process.env.NODE_ENV === "development") {
                        console.warn("TestListTable: No categories found or invalid response", { cleanCategoryFilters });
                    }
                    setTests([]);
                    setGroupedData([]);
                    return;
                }

                // Fetch ALL tests for the subject by fetching tests for each category
                // This gets all tests across all hierarchy levels
                const allTests = [];
                for (const category of categories) {
                    const categoryId = category._id || category.id;
                    if (categoryId) {
                        try {
                            const testFilters = {
                                categoryId,
                                status: "active",
                            };
                            const categoryTests = await fetchPracticeTests(testFilters);
                            if (categoryTests && Array.isArray(categoryTests) && categoryTests.length > 0) {
                                allTests.push(...categoryTests);
                            }
                        } catch (categoryError) {
                            // Log but continue with other categories
                            if (process.env.NODE_ENV === "development") {
                                console.warn("TestListTable: Error fetching tests for category", categoryId, categoryError);
                            }
                        }
                    }
                }

                const fetchedTests = allTests;

                // Process tests with enriched data and filter out tests with no questions
                const processedTests = (fetchedTests || [])
                    .map((test) => {
                        const qCount = test.numberOfQuestions || test.totalQuestions || test.questionCount || 0;
                        return {
                            ...test,
                            numberOfQuestions: qCount,
                            maximumMarks: test.maximumMarks || test.totalMarks || (qCount * DEFAULT_MARKS_PER_QUESTION),
                            duration: test.duration || "N/A",
                        };
                    })
                    .filter((test) => {
                        // Filter out tests with no questions (0, null, or undefined)
                        // Only show tests that have at least 1 question
                        const qCount = test.numberOfQuestions;
                        return qCount !== null && qCount !== undefined && qCount > 0;
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

                // Helper function to get test priority based on hierarchy
                // Returns: 1 = current level (assigned), 2 = child level, 3 = sibling level, 4 = parent level, 5 = other unit (filter out)
                // CRITICAL: Unit isolation - Tests from Unit 1 ONLY show in Unit 1 and its children (chapter/topic/subtopic/definition)
                // Tests from Unit 2 will NEVER show in Unit 1 pages (strict unit boundary)
                // Hierarchy: Exam > Subject > Unit > Chapter > Topic > Subtopic > Definition (7 levels)
                const getTestPriority = (test) => {
                    // Extract test IDs (handle both object and string formats)
                    const tUnitId = test.unitId ? (test.unitId._id || test.unitId.id || test.unitId) : null;
                    const tChapterId = test.chapterId ? (test.chapterId._id || test.chapterId.id || test.chapterId) : null;
                    const tTopicId = test.topicId ? (test.topicId._id || test.topicId.id || test.topicId) : null;
                    const tSubTopicId = test.subTopicId ? (test.subTopicId._id || test.subTopicId.id || test.subTopicId) : null;
                    const tDefinitionId = test.definitionId ? (test.definitionId._id || test.definitionId.id || test.definitionId) : null;
                    const tSubjectId = test.subjectId ? (test.subjectId._id || test.subjectId.id || test.subjectId) : null;
                    const tExamId = test.examId ? (test.examId._id || test.examId.id || test.examId) : null;

                    // Convert to strings for comparison (normalize)
                    const sUnitId = unitId ? String(unitId).trim() : null;
                    const sChapterId = chapterId ? String(chapterId).trim() : null;
                    const sTopicId = topicId ? String(topicId).trim() : null;
                    const sSubTopicId = subTopicId ? String(subTopicId).trim() : null;
                    const sSubjectId = subjectId ? String(subjectId).trim() : null;
                    const sExamId = examId ? String(examId).trim() : null;

                    // Convert test IDs to strings for comparison (normalize)
                    const testUnitId = tUnitId ? String(tUnitId).trim() : null;
                    const testChapterId = tChapterId ? String(tChapterId).trim() : null;
                    const testTopicId = tTopicId ? String(tTopicId).trim() : null;
                    const testSubTopicId = tSubTopicId ? String(tSubTopicId).trim() : null;
                    const testDefinitionId = tDefinitionId ? String(tDefinitionId).trim() : null;
                    const testSubjectId = tSubjectId ? String(tSubjectId).trim() : null;
                    const testExamId = tExamId ? String(tExamId).trim() : null;

                    // CRITICAL: Never show tests from other units
                    // If we're on any page with a unitId, only show tests from that unit
                    // This ensures Unit 1 tests only show in Unit 1 and its children, never in Unit 2
                    if (sUnitId) {
                        // If test has a unitId, it must match the current unitId
                        if (testUnitId && testUnitId !== sUnitId) {
                            return 5; // Filter out - different unit
                        }
                        // If test doesn't have unitId but we're on a unit page, filter it out
                        // (tests should have unitId if they're assigned to a unit)
                        // Exception: If test is assigned to subject level (no unitId), we might want to show it
                        // But for strict unit isolation, we filter it out
                        if (!testUnitId && (sChapterId || sTopicId || sSubTopicId)) {
                            // On a chapter/topic/subtopic page, test must have unitId matching current unit
                            return 5; // Filter out - test doesn't have unitId but we're in a unit's child page
                        }
                    }

                    // SUBTOPIC/DEFINITION PAGE
                    if (sSubTopicId && sTopicId && sChapterId && sUnitId) {
                        // Priority 1: Test assigned to this subtopic/definition (current level)
                        if (testSubTopicId === sSubTopicId && testTopicId === sTopicId && testChapterId === sChapterId) {
                            return 1;
                        }
                        // Priority 2: Test from child levels (definitions within this subtopic)
                        if (testSubTopicId === sSubTopicId && testTopicId === sTopicId && testChapterId === sChapterId && testDefinitionId) {
                            return 2;
                        }
                        // Priority 3: All tests from other chapters, topics, subtopics in the same unit
                        // This includes: sibling subtopics, other topics in same chapter, and ALL nested children from other chapters
                        // Same topic, different subtopic
                        if (testTopicId === sTopicId && testChapterId === sChapterId && testSubTopicId !== sSubTopicId) {
                            return 3;
                        }
                        // Other topics in same chapter (includes their subtopics/definitions)
                        if (testChapterId === sChapterId && testTopicId !== sTopicId) {
                            return 3;
                        }
                        // Other chapters in same unit (includes ALL their topics/subtopics/definitions)
                        if (testUnitId === sUnitId && testChapterId !== sChapterId) {
                            return 3;
                        }
                        // Priority 4: Test from parent level (topic)
                        if (testTopicId === sTopicId && testChapterId === sChapterId && !testSubTopicId) {
                            return 4;
                        }
                        return 5; // Filter out
                    }

                    // TOPIC PAGE
                    if (sTopicId && sChapterId && sUnitId && !sSubTopicId) {
                        // Priority 1: Test assigned to this topic (current level)
                        if (testTopicId === sTopicId && testChapterId === sChapterId && !testSubTopicId && !testDefinitionId) {
                            return 1;
                        }
                        // Priority 2: Test from child levels (subtopics/definitions within this topic)
                        if (testTopicId === sTopicId && testChapterId === sChapterId && (testSubTopicId || testDefinitionId)) {
                            return 2;
                        }
                        // Priority 3: All tests from other chapters, topics, subtopics in the same unit
                        // This includes: sibling topics, and ALL nested children from other chapters
                        // Same chapter, different topic (includes their subtopics/definitions)
                        if (testChapterId === sChapterId && testTopicId !== sTopicId) {
                            return 3;
                        }
                        // Other chapters in same unit (includes ALL their topics/subtopics/definitions)
                        if (testUnitId === sUnitId && testChapterId !== sChapterId) {
                            return 3;
                        }
                        // Priority 4: Test from parent level (chapter)
                        if (testChapterId === sChapterId && !testTopicId) {
                            return 4;
                        }
                        return 5; // Filter out
                    }

                    // CHAPTER PAGE
                    if (sChapterId && sUnitId && !sTopicId && !sSubTopicId) {
                        // Priority 1: Test assigned to this chapter (current level) - ALWAYS AT TOP
                        if (testChapterId === sChapterId && !testTopicId && !testSubTopicId && !testDefinitionId) {
                            return 1;
                        }
                        // Priority 2: Test from child levels (topics/subtopics/definitions within this chapter)
                        if (testChapterId === sChapterId && (testTopicId || testSubTopicId || testDefinitionId)) {
                            return 2;
                        }
                        // Priority 3: ALL tests from sibling chapters AND their ALL nested children (same unit, different chapter)
                        // This includes: tests assigned to other chapters, and ALL tests from topics/subtopics/definitions of other chapters
                        // Shows tests from previous chapters, next chapters, and all their nested children
                        if (testUnitId === sUnitId && testChapterId !== sChapterId) {
                            return 3;
                        }
                        // Priority 4: Test from parent level (unit)
                        if (testUnitId === sUnitId && !testChapterId) {
                            return 4;
                        }
                        return 5; // Filter out
                    }

                    // UNIT PAGE
                    if (sUnitId && !sChapterId && !sTopicId && !sSubTopicId) {
                        // Priority 1: Test assigned to this unit (current level)
                        if (testUnitId === sUnitId && !testChapterId) {
                            return 1;
                        }
                        // Priority 2: Test from child levels (chapters/topics/subtopics/definitions within this unit)
                        if (testUnitId === sUnitId && (testChapterId || testTopicId || testSubTopicId || testDefinitionId)) {
                            return 2;
                        }
                        // Priority 3: Sibling units don't exist (same subject, different unit)
                        // Priority 4: Test from parent level (subject)
                        if (testSubjectId === sSubjectId && !testUnitId) {
                            return 4;
                        }
                        return 5; // Filter out - different unit
                    }

                    // SUBJECT PAGE
                    if (sSubjectId && !sUnitId && !sChapterId && !sTopicId && !sSubTopicId) {
                        // Priority 1: Test assigned to this subject (current level) - no unitId
                        if (testSubjectId === sSubjectId && !testUnitId) {
                            return 1;
                        }
                        // Priority 2: Test from child levels (units/chapters/topics/subtopics/definitions within this subject)
                        // Shows tests from ALL units in this subject (no unit filtering on subject page)
                        if (testSubjectId === sSubjectId && testUnitId) {
                            return 2;
                        }
                        return 5; // Filter out - different subject
                    }

                    // EXAM PAGE (if examId is provided but no subjectId/unitId/etc)
                    // Note: This is rare, but handle it for completeness
                    if (sExamId && !sSubjectId && !sUnitId && !sChapterId && !sTopicId && !sSubTopicId) {
                        // Priority 1: Test assigned to this exam (current level) - no subjectId
                        if (testExamId === sExamId && !testSubjectId) {
                            return 1;
                        }
                        // Priority 2: Test from child levels (subjects/units/chapters/topics/subtopics/definitions within this exam)
                        if (testExamId === sExamId && testSubjectId) {
                            return 2;
                        }
                        return 5; // Filter out - different exam
                    }

                    // Default: filter out
                    return 5;
                };

                // Helper function to get hierarchy depth for sorting nested children
                // Returns: 0 = unit level, 1 = chapter, 2 = topic, 3 = subtopic, 4 = definition
                const getHierarchyDepth = (test) => {
                    if (test.definitionId) return 4; // Definition level
                    if (test.subTopicId) return 3; // Subtopic level
                    if (test.topicId) return 2; // Topic level
                    if (test.chapterId) return 1; // Chapter level
                    return 0; // Unit level
                };

                // Convert map to array, filter, and sort tests within each group
                const grouped = Array.from(categoryMap.values())
                    .map((group) => ({
                        ...group,
                        tests: group.tests
                            .filter((test) => {
                                // Get priority first
                                let priority = getTestPriority(test);
                                let shouldInclude = priority !== 5;

                                // FALLBACK: If test doesn't match hierarchy but is from same subject/unit, include it
                                // This handles cases where tests don't have proper hierarchy IDs set
                                // Since tests are fetched via categories for this subject, they should be shown
                                // Assign a lower priority (6) so they appear at the bottom but are still shown
                                if (!shouldInclude && processedTests.length > 0) {
                                    const testSubjectId = test.subjectId ? (test.subjectId._id || test.subjectId.id || test.subjectId) : null;
                                    const testUnitId = test.unitId ? (test.unitId._id || test.unitId.id || test.unitId) : null;
                                    const testExamId = test.examId ? (test.examId._id || test.examId.id || test.examId) : null;
                                    const sSubjectId = subjectId ? String(subjectId).trim() : null;
                                    const sUnitId = unitId ? String(unitId).trim() : null;
                                    const sExamId = examId ? String(examId).trim() : null;

                                    // CRITICAL FALLBACK: If test was fetched for this subject (via categories), include it
                                    // BUT: Must respect unit boundaries - tests from other units should NEVER be shown
                                    // Tests are fetched using categories filtered by examId and subjectId
                                    // So if a test is in processedTests, it was fetched for this subject and should be shown
                                    // This handles cases where:
                                    // 1. Test doesn't have subjectId set (null)
                                    // 2. Test has hierarchy IDs that don't match exactly
                                    // 3. Test doesn't have examId set (but was fetched via categories for this exam/subject)
                                    // IMPORTANT: We still respect unit boundaries - if on a unit page, test must be from that unit
                                    if (sSubjectId) {
                                        // STRICT UNIT CHECK: If we're on a unit page (or its children), test MUST be from that unit
                                        if (sUnitId) {
                                            // On a unit page - test must have matching unitId or no unitId (subject-level test)
                                            // But if test has a different unitId, NEVER include it (strict unit isolation)
                                            if (testUnitId && testUnitId !== sUnitId) {
                                                // Test is from a different unit - DO NOT include (strict unit isolation)
                                                return false; // Don't include - different unit
                                            }
                                        }

                                        // Verify exam matches (if both examId and testExamId are provided)
                                        // If test doesn't have examId, it was still fetched for this exam (via categories)
                                        const examMatches = !sExamId || !testExamId || (testExamId && String(testExamId).trim() === sExamId);

                                        if (examMatches) {
                                            // If test has subjectId, it must match
                                            // If test doesn't have subjectId, it was still fetched for this subject (via categories)
                                            const subjectMatches = !testSubjectId || (testSubjectId && String(testSubjectId).trim() === sSubjectId);

                                            if (subjectMatches) {
                                                shouldInclude = true;
                                                priority = 6; // Lower priority - show at bottom
                                                // Log only in development for debugging
                                                if (process.env.NODE_ENV === "development") {
                                                    console.log("TestListTable: Including test via category fallback", {
                                                        testName: test.name,
                                                        testSubjectId,
                                                        testExamId,
                                                        testUnitId,
                                                        currentSubjectId: sSubjectId,
                                                        currentExamId: sExamId,
                                                        currentUnitId: sUnitId,
                                                        reason: "Test fetched for this subject via categories (same unit)"
                                                    });
                                                }
                                            }
                                        }
                                    }

                                    // Additional fallback: If on unit page and test has same unitId, include it
                                    // (This is redundant if above catches it, but kept for explicit unit matching)
                                    if (!shouldInclude && sUnitId && testUnitId && String(testUnitId).trim() === sUnitId) {
                                        shouldInclude = true;
                                        priority = 6;
                                        // Log only in development for debugging
                                        if (process.env.NODE_ENV === "development") {
                                            console.log("TestListTable: Including test via unit fallback", test.name);
                                        }
                                    }
                                }

                                // Store priority on test for sorting
                                if (shouldInclude) {
                                    test._computedPriority = priority;
                                }

                                // Debug logging in development
                                if (process.env.NODE_ENV === "development" && !shouldInclude && processedTests.length > 0) {
                                    const testUnitId = test.unitId ? (test.unitId._id || test.unitId.id || test.unitId) : null;
                                    const testChapterId = test.chapterId ? (test.chapterId._id || test.chapterId.id || test.chapterId) : null;
                                    const testSubjectId = test.subjectId ? (test.subjectId._id || test.subjectId.id || test.subjectId) : null;
                                    console.log("TestListTable: Filtered out test", {
                                        testName: test.name,
                                        testUnitId,
                                        testChapterId,
                                        testSubjectId,
                                        currentUnitId: unitId,
                                        currentChapterId: chapterId,
                                        currentSubjectId: subjectId,
                                        priority,
                                        reason: "Different unit/subject or doesn't match hierarchy"
                                    });
                                }

                                return shouldInclude;
                            })
                            .sort((a, b) => {
                                // Primary sort: Priority (1 = current, 2 = child, 3 = sibling, 4 = parent, 6 = fallback)
                                // Use computed priority if available (for fallback cases), otherwise get from function
                                const aPriority = a._computedPriority !== undefined ? a._computedPriority : getTestPriority(a);
                                const bPriority = b._computedPriority !== undefined ? b._computedPriority : getTestPriority(b);

                                if (aPriority !== bPriority) {
                                    return aPriority - bPriority;
                                }

                                // For unit page: Sort nested children by hierarchy depth (ascending)
                                // Chapter tests come before topic tests, topic before subtopic, subtopic before definition
                                if (unitId && !chapterId && !topicId && !subTopicId && aPriority === 2 && bPriority === 2) {
                                    const aDepth = getHierarchyDepth(a);
                                    const bDepth = getHierarchyDepth(b);
                                    if (aDepth !== bDepth) {
                                        return aDepth - bDepth; // Ascending order: chapter < topic < subtopic < definition
                                    }
                                }

                                // For chapter page: Sort nested children by hierarchy depth for all priorities
                                // Priority 2: Nested children of current chapter (topics/subtopics/definitions)
                                if (chapterId && unitId && !topicId && !subTopicId && aPriority === 2 && bPriority === 2) {
                                    const aDepth = getHierarchyDepth(a);
                                    const bDepth = getHierarchyDepth(b);
                                    if (aDepth !== bDepth) {
                                        return aDepth - bDepth; // Ascending order: topic < subtopic < definition
                                    }
                                }

                                // Priority 3: Sibling chapters and their nested children
                                // Sort by hierarchy depth: chapter-level first, then topics, then subtopics, then definitions
                                if (chapterId && unitId && !topicId && !subTopicId && aPriority === 3 && bPriority === 3) {
                                    const aDepth = getHierarchyDepth(a);
                                    const bDepth = getHierarchyDepth(b);
                                    if (aDepth !== bDepth) {
                                        return aDepth - bDepth; // Ascending order: chapter < topic < subtopic < definition
                                    }
                                }

                                // For topic page: Sort nested children by hierarchy depth
                                // Priority 2: Nested children of current topic (subtopics/definitions)
                                if (topicId && chapterId && unitId && !subTopicId && aPriority === 2 && bPriority === 2) {
                                    const aDepth = getHierarchyDepth(a);
                                    const bDepth = getHierarchyDepth(b);
                                    if (aDepth !== bDepth) {
                                        return aDepth - bDepth; // Ascending order: subtopic < definition
                                    }
                                }

                                // Priority 3: Sibling topics and ALL nested children from other chapters
                                // Sort by hierarchy depth: chapter-level first, then topics, then subtopics, then definitions
                                // This ensures all nested children from previous/next chapters are properly sorted
                                if (topicId && chapterId && unitId && !subTopicId && aPriority === 3 && bPriority === 3) {
                                    const aDepth = getHierarchyDepth(a);
                                    const bDepth = getHierarchyDepth(b);
                                    if (aDepth !== bDepth) {
                                        return aDepth - bDepth; // Ascending order: chapter < topic < subtopic < definition
                                    }
                                }

                                // For subtopic/definition page: Sort nested children by hierarchy depth
                                // Priority 2: Nested children of current subtopic (definitions)
                                if (subTopicId && topicId && chapterId && unitId && aPriority === 2 && bPriority === 2) {
                                    const aDepth = getHierarchyDepth(a);
                                    const bDepth = getHierarchyDepth(b);
                                    if (aDepth !== bDepth) {
                                        return aDepth - bDepth; // Ascending order: definition
                                    }
                                }

                                // Priority 3: Sibling subtopics and ALL nested children from other chapters/topics
                                // Sort by hierarchy depth: chapter-level first, then topics, then subtopics, then definitions
                                // This ensures all nested children from previous/next chapters are properly sorted
                                if (subTopicId && topicId && chapterId && unitId && aPriority === 3 && bPriority === 3) {
                                    const aDepth = getHierarchyDepth(a);
                                    const bDepth = getHierarchyDepth(b);
                                    if (aDepth !== bDepth) {
                                        return aDepth - bDepth; // Ascending order: chapter < topic < subtopic < definition
                                    }
                                }

                                // Secondary sort: OrderNumber if available (for sorting only, not display)
                                const aOrder = a.orderNumber || 999;
                                const bOrder = b.orderNumber || 999;
                                return aOrder - bOrder;
                            })
                            .map((test, index) => {
                                // Assign sequential display order number (1, 2, 3...) for client-side display
                                // This ensures tests show in sequential order regardless of database orderNumber
                                return {
                                    ...test,
                                    _displayOrderNumber: index + 1,
                                };
                            }),
                    }))
                    .filter((group) => {
                        // Filter out groups with no tests after filtering
                        return group.tests.length > 0;
                    });

                setGroupedData(grouped);

                // Debug logging in development
                if (process.env.NODE_ENV === "development") {
                    console.log("TestListTable: Test filtering results", {
                        totalTests: processedTests.length,
                        groupedCategories: grouped.length,
                        totalTestsAfterFilter: grouped.reduce((sum, g) => sum + g.tests.length, 0),
                        currentPage: {
                            examId,
                            subjectId,
                            unitId,
                            chapterId,
                            topicId,
                            subTopicId
                        },
                        categories: grouped.map(g => ({
                            categoryName: g.category.name,
                            testCount: g.tests.length
                        }))
                    });
                }

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
                console.error("TestListTable: Error loading tests:", err);
                setError("Failed to load tests. Please try again.");
                setTests([]);
                setGroupedData([]); // Ensure groupedData is also cleared on error
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

        // Scroll to top immediately before navigation
        // Use multiple methods to ensure it works across all browsers
        if (typeof window !== "undefined") {
            // Immediate scroll (instant)
            window.scrollTo({ top: 0, behavior: 'auto' });
            if (document.documentElement) {
                document.documentElement.scrollTop = 0;
            }
            if (document.body) {
                document.body.scrollTop = 0;
            }

            // Also scroll any scrollable containers
            const scrollableContainers = document.querySelectorAll('[data-scroll-container]');
            scrollableContainers.forEach(container => {
                container.scrollTop = 0;
            });
        }

        router.push(`?${params.toString()}`, { scroll: false });

        // Additional scroll attempts after navigation (with delays to handle async rendering)
        if (typeof window !== "undefined") {
            // Scroll after a short delay (for immediate DOM updates)
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'auto' });
                if (document.documentElement) {
                    document.documentElement.scrollTop = 0;
                }
                if (document.body) {
                    document.body.scrollTop = 0;
                }
            }, 100);

            // Scroll after longer delay (for test component to render)
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 300);

            // Final scroll attempt (for slow rendering)
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'auto' });
            }, 500);
        }
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

    // If no tests available, don't show the component at all
    if (tests.length === 0) {
        return null;
    }

    // If no grouped data after filtering, don't show the component
    // This can happen if tests exist but are filtered out by priority logic
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
                                                    <span className="mr-1">{test._displayOrderNumber || (i + 1)}.</span>
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
                                        <span className="mr-1">{test._displayOrderNumber || (i + 1)}.</span>
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

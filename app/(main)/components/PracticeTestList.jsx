"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  FaClock,
  FaFileAlt,
  FaPlay,
  FaTimesCircle,
  FaArrowLeft,
  FaArrowRight,
  FaFlag,
  FaCheck,
  FaSave,
  FaCheckCircle,
  FaArrowLeft as FaBack,
  FaTimes,
  FaLock,
  FaUser,
} from "react-icons/fa";
import {
  fetchPracticeTests,
  fetchPracticeCategories,
  fetchPracticeTestById,
  fetchPracticeTestQuestions,
  saveTestResult,
  fetchStudentTestResults,
} from "../lib/api";
import LoadingState from "./LoadingState";
import TestSubmissionRegistrationModal from "./TestSubmissionRegistrationModal";
import Card from "./Card";
import Button from "./Button";
import { logger } from "@/utils/logger";

const PracticeTestList = ({
  examId,
  subjectId,
  unitId,
  chapterId,
  topicId,
  subTopicId,
}) => {
  const [practiceTests, setPracticeTests] = useState([]);
  const [practiceCategories, setPracticeCategories] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Test taking state
  const [selectedTest, setSelectedTest] = useState(null);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Authentication and registration state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [pendingTestResults, setPendingTestResults] = useState(null);
  const [studentScores, setStudentScores] = useState({}); // testId -> best score

  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === "undefined") return false;
      const token = localStorage.getItem("student_token");
      const nowAuthenticated = !!token;
      setIsAuthenticated(nowAuthenticated);
      return nowAuthenticated;
    };

    checkAuth();

    // Listen for storage changes (login/logout)
    const handleStorageChange = (e) => {
      if (e.key === "student_token") {
        checkAuth();
      }
    };

    // Listen for custom login event
    const handleLoginEvent = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("student-login", handleLoginEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("student-login", handleLoginEvent);
    };
  }, []);

  // Fetch student scores when authenticated and tests are loaded
  const fetchStudentScores = React.useCallback(async () => {
    if (!isAuthenticated || practiceTests.length === 0) {
      setStudentScores({});
      return;
    }

    try {
      const scorePromises = practiceTests.map(async (test) => {
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
  }, [isAuthenticated, practiceTests]);

  // Fetch scores when authenticated and tests change
  useEffect(() => {
    if (isAuthenticated && practiceTests.length > 0) {
      fetchStudentScores();
    } else {
      setStudentScores({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, practiceTests.length]);

  // Close registration modal and save pending results if user logs in from another tab
  useEffect(() => {
    if (isAuthenticated && showRegistrationModal) {
      setShowRegistrationModal(false);
    }

    // If student logs in and there are pending results, save them
    if (isAuthenticated && pendingTestResults) {
      const savePendingResults = async () => {
        try {
          const saveResult = await saveTestResult(pendingTestResults);
          if (saveResult.success && saveResult.data) {
            const testIdStr = String(pendingTestResults.testId);
            // Update score with saved data
            setStudentScores((prev) => ({
              ...prev,
              [testIdStr]: {
                totalMarks: saveResult.data.totalMarks,
                maximumMarks: saveResult.data.maximumMarks,
                percentage: saveResult.data.percentage,
              },
            }));
          }
          // Clear pending results after saving
          setPendingTestResults(null);
        } catch (error) {
          logger.error("Error saving pending test results:", error);
        }
      };
      savePendingResults();
    }
  }, [isAuthenticated, showRegistrationModal, pendingTestResults]);

  useEffect(() => {
    const loadPracticeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch categories first based on examId and subjectId
        // Clean filters to remove undefined values
        const categoryFilters = {
          examId,
          subjectId,
          status: "active",
        };
        const cleanCategoryFilters = {};
        Object.keys(categoryFilters).forEach((key) => {
          if (
            categoryFilters[key] !== null &&
            categoryFilters[key] !== undefined
          ) {
            cleanCategoryFilters[key] = categoryFilters[key];
          }
        });
        const categories = await fetchPracticeCategories(cleanCategoryFilters);
        setPracticeCategories(categories);

        // Cascading filter: Try current level first, then its children only
        // Logic based on page level:
        // - Subject page: Show all tests for that subject
        // - Unit page: Try unit first, then children (chapters, topics, subtopics)
        // - Chapter page: Try chapter first, then children (topics, subtopics)
        // - Topic page: Try topic first, then children (subtopics)
        // - Subtopic page: Show tests for that subtopic only (no children)
        let tests = [];

        // Helper function to clean filters
        const cleanFilters = (filters) => {
          const cleaned = {};
          Object.keys(filters).forEach((key) => {
            if (filters[key] !== null && filters[key] !== undefined) {
              cleaned[key] = filters[key];
            }
          });
          return cleaned;
        };

        // Determine page level and implement cascading logic
        if (subTopicId) {
          // Subtopic page: Show tests for that subtopic only (no children)
          const filters = cleanFilters({
            examId,
            subjectId,
            unitId,
            chapterId,
            topicId,
            subTopicId,
            status: "active",
          });
          tests = await fetchPracticeTests(filters);
        } else if (topicId) {
          // Topic page: Try topic first, then children (subtopics)
          // Step 1: Try current level (topic) - tests directly linked to this topic
          const currentFilters = cleanFilters({
            examId,
            subjectId,
            unitId,
            chapterId,
            topicId,
            status: "active",
          });
          tests = await fetchPracticeTests(currentFilters);

          // Step 2: If no tests, try children (subtopics under this topic)
          // Fetch by categoryId to bypass hierarchical filtering, then filter client-side
          if (!tests || tests.length === 0) {
            const allCategoryTests = [];
            for (const category of categories) {
              const categoryId = category._id || category.id;
              if (categoryId) {
                const categoryFilters = cleanFilters({
                  categoryId,
                  status: "active",
                });
                const categoryTests = await fetchPracticeTests(categoryFilters);
                if (categoryTests && categoryTests.length > 0) {
                  allCategoryTests.push(...categoryTests);
                }
              }
            }
            // Filter to only include tests that are children of this topic (have topicId and subTopicId)
            tests = allCategoryTests.filter((test) => {
              const testTopicId = test.topicId?._id || test.topicId;
              const testSubTopicId = test.subTopicId?._id || test.subTopicId;
              return (
                testTopicId &&
                String(testTopicId) === String(topicId) &&
                testSubTopicId // Must have subTopicId to be a child
              );
            });
          }
        } else if (chapterId) {
          // Chapter page: Try chapter first, then children (topics, subtopics)
          // Step 1: Try current level (chapter) - tests directly linked to this chapter
          const currentFilters = cleanFilters({
            examId,
            subjectId,
            unitId,
            chapterId,
            status: "active",
          });
          tests = await fetchPracticeTests(currentFilters);

          // Step 2: If no tests, try children (topics and subtopics under this chapter)
          // Fetch by categoryId to bypass hierarchical filtering, then filter client-side
          if (!tests || tests.length === 0) {
            const allCategoryTests = [];
            for (const category of categories) {
              const categoryId = category._id || category.id;
              if (categoryId) {
                const categoryFilters = cleanFilters({
                  categoryId,
                  status: "active",
                });
                const categoryTests = await fetchPracticeTests(categoryFilters);
                if (categoryTests && categoryTests.length > 0) {
                  allCategoryTests.push(...categoryTests);
                }
              }
            }
            // Filter to only include tests that are children of this chapter
            // (have chapterId and either topicId or subTopicId)
            tests = allCategoryTests.filter((test) => {
              const testChapterId = test.chapterId?._id || test.chapterId;
              const testTopicId = test.topicId?._id || test.topicId;
              const testSubTopicId = test.subTopicId?._id || test.subTopicId;
              return (
                testChapterId &&
                String(testChapterId) === String(chapterId) &&
                (testTopicId || testSubTopicId) // Must have topicId or subTopicId to be a child
              );
            });
          }
        } else if (unitId) {
          // Unit page: Try unit first, then children (chapters, topics, subtopics)
          // Step 1: Try current level (unit) - tests directly linked to this unit
          const currentFilters = cleanFilters({
            examId,
            subjectId,
            unitId,
            status: "active",
          });
          tests = await fetchPracticeTests(currentFilters);

          // Step 2: If no tests, try children (chapters, topics, subtopics under this unit)
          // Fetch by categoryId to bypass hierarchical filtering, then filter client-side
          if (!tests || tests.length === 0) {
            const allCategoryTests = [];
            for (const category of categories) {
              const categoryId = category._id || category.id;
              if (categoryId) {
                const categoryFilters = cleanFilters({
                  categoryId,
                  status: "active",
                });
                const categoryTests = await fetchPracticeTests(categoryFilters);
                if (categoryTests && categoryTests.length > 0) {
                  allCategoryTests.push(...categoryTests);
                }
              }
            }
            // Filter to only include tests that are children of this unit
            // (have unitId and at least one of chapterId/topicId/subTopicId)
            tests = allCategoryTests.filter((test) => {
              const testUnitId = test.unitId?._id || test.unitId;
              const testChapterId = test.chapterId?._id || test.chapterId;
              const testTopicId = test.topicId?._id || test.topicId;
              const testSubTopicId = test.subTopicId?._id || test.subTopicId;
              return (
                testUnitId &&
                String(testUnitId) === String(unitId) &&
                (testChapterId || testTopicId || testSubTopicId) // Must have at least one child level
              );
            });
          }
        } else if (subjectId) {
          // Subject page: Show all test categories and papers for that subject
          // Fetch tests by categoryId to get ALL tests for each category, regardless of hierarchy
          // First, we already have categories fetched above
          // Now fetch tests for each category
          const allTests = [];
          for (const category of categories) {
            const categoryId = category._id || category.id;
            if (categoryId) {
              const categoryFilters = cleanFilters({
                categoryId, // Fetch by categoryId directly to bypass hierarchical filtering
                status: "active",
              });
              const categoryTests = await fetchPracticeTests(categoryFilters);
              if (categoryTests && categoryTests.length > 0) {
                allTests.push(...categoryTests);
              }
            }
          }
          tests = allTests;
        } else if (examId) {
          // Exam page: Show all tests for this exam
          const filters = cleanFilters({
            examId,
            status: "active",
          });
          tests = await fetchPracticeTests(filters);
        }

        setPracticeTests(tests);

        // Fetch scores after tests are loaded (if authenticated)
        // This ensures scores are fetched after practiceTests state is updated
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("student_token");
          if (token && tests.length > 0) {
            // Use setTimeout to ensure state is updated before fetching
            setTimeout(() => {
              fetchStudentScores();
            }, 100);
          }
        }

        // Group tests by category - Only show categories that have subcategories (papers/tests)
        // If a category has no subcategories, don't show it
        const grouped = categories
          .map((category) => {
            const categoryId = category._id || category.id;
            const categoryTests = tests.filter((test) => {
              // Handle different categoryId formats
              // API populates categoryId as: { _id: "...", name: "...", ... }
              // Or it might be just a string ID
              let testCategoryId = null;

              if (test.categoryId) {
                if (typeof test.categoryId === "object") {
                  // Populated object
                  testCategoryId = test.categoryId._id || test.categoryId.id;
                } else {
                  // String ID
                  testCategoryId = test.categoryId;
                }
              }

              // Also check alternative field names
              if (!testCategoryId && test.category) {
                if (typeof test.category === "object") {
                  testCategoryId = test.category._id || test.category.id;
                } else {
                  testCategoryId = test.category;
                }
              }

              // Compare as strings to handle ObjectId vs string mismatches
              const matches =
                testCategoryId &&
                categoryId &&
                String(testCategoryId).trim() === String(categoryId).trim();

              return matches;
            });
            return {
              category,
              tests: categoryTests,
            };
          })
          .filter((group) => group.tests.length > 0); // Only show categories that have subcategories (papers)

        // Debug logging (can be removed in production)
        if (process.env.NODE_ENV === "development") {
          console.log("PracticeTestList Debug:", {
            categoriesCount: categories.length,
            testsCount: tests.length,
            groupedCount: grouped.length,
            categories: categories.map((c) => ({
              id: c._id || c.id,
              name: c.name,
            })),
            tests: tests.map((t) => ({
              id: t._id,
              name: t.name,
              categoryId: t.categoryId?._id || t.categoryId,
            })),
            grouped: grouped.map((g) => ({
              categoryName: g.category.name,
              testsCount: g.tests.length,
            })),
          });
        }

        setGroupedData(grouped);
      } catch (err) {
        logger.error("Error loading practice data:", err);
        setError("Failed to load practice tests. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    if (examId || subjectId || unitId || chapterId || topicId || subTopicId) {
      loadPracticeData();
    } else {
      setIsLoading(false);
    }
  }, [examId, subjectId, unitId, chapterId, topicId, subTopicId]);

  // Parse duration string (e.g., "60 Min" or "60")
  const parseDuration = (durationStr) => {
    if (!durationStr) return null;
    const match = durationStr.match(/(\d+)/);
    return match ? parseInt(match[1]) * 60 : null;
  };

  // Load test and questions when a test is selected
  useEffect(() => {
    const loadTest = async () => {
      if (!selectedTest) return;

      try {
        setIsLoadingTest(true);
        setError(null);

        const [testData, questionsData] = await Promise.all([
          fetchPracticeTestById(selectedTest),
          fetchPracticeTestQuestions(selectedTest),
        ]);

        if (!testData) {
          setError("Practice test not found");
          setIsLoadingTest(false);
          return;
        }

        setTest(testData);
        setQuestions(questionsData);

        const initialAnswers = {};
        questionsData.forEach((q) => {
          initialAnswers[q._id] = null;
        });
        setAnswers(initialAnswers);

        const durationSeconds = parseDuration(testData.duration);
        if (durationSeconds) {
          setTimeRemaining(durationSeconds);
        }
      } catch (err) {
        logger.error("Error loading practice test:", err);
        setError("Failed to load practice test. Please try again.");
      } finally {
        setIsLoadingTest(false);
      }
    };

    loadTest();
  }, [selectedTest]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (seconds === null) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Start test
  const handleStartTest = () => {
    setIsTestStarted(true);
    startTimeRef.current = Date.now();
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Toggle marked for review
  const handleToggleMarked = (questionId) => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Navigate to question
  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Calculate results
  const calculateResults = React.useCallback(() => {
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalMarks = 0;
    const questionResults = [];

    const marksPerQuestion = test.maximumMarks / questions.length;
    const negativeMarks = test.negativeMarks || 0;

    questions.forEach((question) => {
      const userAnswer = answers[question._id];
      const correctAnswer = question.answer;

      if (!userAnswer) {
        unansweredCount++;
        questionResults.push({
          questionId: question._id,
          question: question.question,
          userAnswer: null,
          correctAnswer,
          isCorrect: false,
          marks: 0,
        });
      } else if (userAnswer.toUpperCase() === correctAnswer.toUpperCase()) {
        correctCount++;
        totalMarks += marksPerQuestion;
        questionResults.push({
          questionId: question._id,
          question: question.question,
          userAnswer,
          correctAnswer,
          isCorrect: true,
          marks: marksPerQuestion,
        });
      } else {
        incorrectCount++;
        // For incorrect answers: subtract negative marks only (don't add marksPerQuestion)
        totalMarks -= negativeMarks;
        questionResults.push({
          questionId: question._id,
          question: question.question,
          userAnswer,
          correctAnswer,
          isCorrect: false,
          marks: -negativeMarks,
        });
      }
    });

    const percentage = (totalMarks / test.maximumMarks) * 100;

    return {
      totalQuestions: questions.length,
      correctCount,
      incorrectCount,
      unansweredCount,
      totalMarks: Math.max(0, totalMarks),
      maximumMarks: test.maximumMarks,
      percentage: Math.round(percentage * 100) / 100,
      questionResults,
      timeTaken: startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0,
    };
  }, [questions, answers, test]);

  // Show submit confirmation modal
  const handleShowSubmitModal = () => {
    setShowSubmitModal(true);
  };

  // Submit test (called after confirmation) and calculate results
  const handleSubmitTest = React.useCallback(
    async (autoSubmit = false) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      setShowSubmitModal(false);
      const calculatedResults = calculateResults();
      const testIdStr = String(selectedTest);

      // Always set results and mark as submitted (for display)
      setResults(calculatedResults);
      setIsTestSubmitted(true);
      setIsTestStarted(false);

      // If student is NOT logged in, show registration modal AND results page with prompt
      if (!isAuthenticated && test && selectedTest) {
        setPendingTestResults({
          testId: testIdStr,
          examId: examId || null,
          subjectId: subjectId || null,
          unitId: unitId || null,
          chapterId: chapterId || null,
          topicId: topicId || null,
          subTopicId: subTopicId || null,
          totalQuestions: calculatedResults.totalQuestions,
          correctCount: calculatedResults.correctCount,
          incorrectCount: calculatedResults.incorrectCount,
          unansweredCount: calculatedResults.unansweredCount,
          totalMarks: calculatedResults.totalMarks,
          maximumMarks: calculatedResults.maximumMarks,
          percentage: calculatedResults.percentage,
          timeTaken: calculatedResults.timeTaken,
          answers: answers,
          questionResults: calculatedResults.questionResults,
          startedAt: startTimeRef.current
            ? new Date(startTimeRef.current)
            : new Date(),
        });
        setShowRegistrationModal(true);
        return;
      }

      // Save results to database if student is authenticated
      if (isAuthenticated && test && selectedTest) {
        try {
          const resultData = {
            testId: testIdStr,
            examId: examId || null,
            subjectId: subjectId || null,
            unitId: unitId || null,
            chapterId: chapterId || null,
            topicId: topicId || null,
            subTopicId: subTopicId || null,
            totalQuestions: calculatedResults.totalQuestions,
            correctCount: calculatedResults.correctCount,
            incorrectCount: calculatedResults.incorrectCount,
            unansweredCount: calculatedResults.unansweredCount,
            totalMarks: calculatedResults.totalMarks,
            maximumMarks: calculatedResults.maximumMarks,
            percentage: calculatedResults.percentage,
            timeTaken: calculatedResults.timeTaken,
            answers: answers,
            questionResults: calculatedResults.questionResults,
            startedAt: startTimeRef.current
              ? new Date(startTimeRef.current)
              : new Date(),
          };

          const saveResult = await saveTestResult(resultData);
          if (saveResult.success && saveResult.data) {
            // Update score immediately with saved data
            setStudentScores((prev) => ({
              ...prev,
              [testIdStr]: {
                totalMarks: saveResult.data.totalMarks,
                maximumMarks: saveResult.data.maximumMarks,
                percentage: saveResult.data.percentage,
              },
            }));
          }
        } catch (error) {
          logger.error("Error saving test result:", error);
        }
      }
    },
    [
      calculateResults,
      isAuthenticated,
      test,
      selectedTest,
      examId,
      subjectId,
      unitId,
      chapterId,
      topicId,
      subTopicId,
      answers,
      fetchStudentScores,
    ]
  );

  // Handle registration success - save results and show them
  const handleRegistrationSuccess = React.useCallback(
    async (token) => {
      setShowRegistrationModal(false);

      if (typeof window !== "undefined") {
        const storedToken = localStorage.getItem("student_token");
        if (storedToken) {
          setIsAuthenticated(true);
        }
      }

      // Results are already set, just ensure they're displayed
      if (pendingTestResults) {
        setResults({
          totalQuestions: pendingTestResults.totalQuestions,
          correctCount: pendingTestResults.correctCount,
          incorrectCount: pendingTestResults.incorrectCount,
          unansweredCount: pendingTestResults.unansweredCount,
          totalMarks: pendingTestResults.totalMarks,
          maximumMarks: pendingTestResults.maximumMarks,
          percentage: pendingTestResults.percentage,
          questionResults: pendingTestResults.questionResults,
          timeTaken: pendingTestResults.timeTaken,
        });
        setIsTestSubmitted(true);
        setIsTestStarted(false);
      }

      // Save pending test results to database
      if (pendingTestResults) {
        try {
          const saveResult = await saveTestResult(pendingTestResults);
          if (saveResult.success && saveResult.data) {
            const testIdStr = String(pendingTestResults.testId);
            // Update score with saved data
            setStudentScores((prev) => ({
              ...prev,
              [testIdStr]: {
                totalMarks: saveResult.data.totalMarks,
                maximumMarks: saveResult.data.maximumMarks,
                percentage: saveResult.data.percentage,
              },
            }));
          }
        } catch (error) {
          // Silently fail
        }
        setPendingTestResults(null);
      }
    },
    [pendingTestResults]
  );

  // Timer effect to submit test automatically if time is up
  useEffect(() => {
    if (isTestStarted && timeRemaining !== null && timeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitTest(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [isTestStarted, timeRemaining, handleSubmitTest]);

  // Reset test view
  const handleBackToList = () => {
    setSelectedTest(null);
    setTest(null);
    setQuestions([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setTimeRemaining(null);
    setIsTestStarted(false);
    setIsTestSubmitted(false);
    setResults(null);
    setMarkedForReview(new Set());
    setShowRegistrationModal(false);
    setPendingTestResults(null);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Refresh scores when going back to list
    if (isAuthenticated && practiceTests.length > 0) {
      setTimeout(() => {
        fetchStudentScores();
      }, 300);
    }
  };

  // Helper function to get the deepest hierarchy level of a test
  const getHierarchyPath = (test) => {
    if (test.subTopicId?.name) {
      return {
        label: "Subtopic",
        name: test.subTopicId.name,
        color: "bg-cyan-100 text-cyan-700",
      };
    }
    if (test.topicId?.name) {
      return {
        label: "Topic",
        name: test.topicId.name,
        color: "bg-yellow-100 text-yellow-700",
      };
    }
    if (test.chapterId?.name) {
      return {
        label: "Chapter",
        name: test.chapterId.name,
        color: "bg-pink-100 text-pink-700",
      };
    }
    if (test.unitId?.name) {
      return {
        label: "Unit",
        name: test.unitId.name,
        color: "bg-purple-100 text-purple-700",
      };
    }
    return null;
  };

  // Show test list loading if tests are not loaded
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent mb-3"></div>
          <p className="text-sm text-gray-600">Loading practice tests...</p>
        </div>
      </div>
    );
  }

  // Show error if test is not found
  if (error && !selectedTest) {
    return (
      <Card variant="standard" hover={false} className="p-4">
        <div className="flex items-center gap-2 text-red-700">
          <FaTimesCircle className="text-sm" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </Card>
    );
  }

  // Show test taking interface if test is selected
  if (selectedTest) {
    // Loading test
    if (isLoadingTest) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-sm text-gray-600">Loading practice test...</p>
          </div>
        </div>
      );
    }

    // Show error loading test if test is not found
    if (error || !test) {
      return (
        <Card variant="standard" hover={false} className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 text-red-700">
              <FaTimesCircle className="text-sm" />
              <p className="text-sm font-medium">
                {error || "Practice test not found"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBackToList}>
            Back to Tests
          </Button>
        </Card>
      );
    }

    // Show no questions available if test has no questions
    if (questions.length === 0) {
      return (
        <Card variant="standard" hover={false} className="p-6">
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Questions Available
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This practice test doesn&apos;t have any questions yet.
            </p>
            <Button variant="ghost" size="sm" onClick={handleBackToList}>
              Back to Tests
            </Button>
          </div>
        </Card>
      );
    }

    // Show results view if test is submitted
    if (isTestSubmitted && results) {
      // If student is NOT authenticated, show login/register prompt page
      if (!isAuthenticated && pendingTestResults) {
        return (
          <div className=" bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Registration Modal */}
            <TestSubmissionRegistrationModal
              isOpen={showRegistrationModal && !isAuthenticated}
              onClose={() => {
                setShowRegistrationModal(false);
                // Keep results visible even if modal is closed
              }}
              onRegistrationSuccess={handleRegistrationSuccess}
              testName={test?.name}
            />

            {/* Login / Register Prompt Page */}
            <Card variant="premium" hover={false} className="relative">
              <div className="relative z-10 p-6 md:p-8">
                {/* Lock Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-105">
                      <FaLock className="text-white text-xl md:text-2xl" />
                    </div>
                    {/* Small Active Indicator */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-4 leading-tight">
                  Login or Create Account to View Results
                </h1>

                {/* Description */}
                <p className="text-sm text-gray-600 text-center mb-8 max-w-xl mx-auto leading-relaxed">
                  Your test was submitted successfully! Login or register to
                  view your detailed performance, track your strengths, and
                  review each question in depth.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {/* Create Account */}
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setShowRegistrationModal(true)}
                    className="flex items-center gap-2"
                  >
                    <FaUser className="text-sm" />
                    Create Account
                  </Button>

                  {/* Login */}
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        const currentPath =
                          window.location.pathname + window.location.search;
                        sessionStorage.setItem(
                          "redirectAfterLogin",
                          currentPath
                        );
                        window.location.href = "/login";
                      }
                    }}
                    className="flex items-center gap-2 border-purple-600 text-purple-600 hover:bg-purple-50 hover:border-purple-700 hover:text-purple-700"
                  >
                    <FaLock className="text-sm" />
                    Login
                  </Button>

                  {/* Back */}
                  <Button variant="ghost" size="md" onClick={handleBackToList}>
                    Go Back
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );
      }

      // If authenticated, show full results
      return (
        <div className="space-y-6">
          {/* Results Header */}
          <Card variant="standard" hover={false} className="p-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Test Results
              </h1>
              <p className="text-sm text-gray-600">{test.name}</p>
            </div>
          </Card>

          {/* Score Card */}
          <Card variant="standard" hover={false} className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-2xl font-semibold text-gray-900 mb-1">
                  {results.percentage}%
                </div>
                <div className="text-xs text-gray-600">Score</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-2xl font-semibold text-gray-900 mb-1">
                  {results.correctCount}
                </div>
                <div className="text-xs text-gray-600">Correct</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-2xl font-semibold text-gray-900 mb-1">
                  {results.incorrectCount}
                </div>
                <div className="text-xs text-gray-600">Incorrect</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-2xl font-semibold text-gray-900 mb-1">
                  {results.unansweredCount}
                </div>
                <div className="text-xs text-gray-600">Unanswered</div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-semibold text-gray-900">
                    {results.totalMarks.toFixed(2)} / {results.maximumMarks}
                  </div>
                  <div className="text-xs text-gray-600">Total Marks</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Time Taken: {Math.floor(results.timeTaken / 60)}m{" "}
                    {results.timeTaken % 60}s
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Question-wise Results */}
          <Card variant="standard" hover={false} className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Question-wise Results
            </h2>
            <div className="space-y-6">
              {results.questionResults.map((result, index) => {
                const question = questions.find(
                  (q) => q._id === result.questionId
                );
                return (
                  <div
                    key={result.questionId}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full font-medium bg-white text-gray-900 border border-gray-300 text-xs">
                          {index + 1}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900">
                          {result.question}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {result.isCorrect ? (
                          <FaCheckCircle className="text-green-600 text-xl" />
                        ) : (
                          <FaTimesCircle className="text-red-600 text-xl" />
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            result.isCorrect
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {result.marks > 0
                            ? `+${result.marks.toFixed(2)}`
                            : result.marks.toFixed(2)}{" "}
                          marks
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {["A", "B", "C", "D"].map((option) => {
                        const optionKey = `option${option}`;
                        const optionText = question[optionKey];
                        const isUserAnswer = result.userAnswer === option;
                        const isCorrectAnswer = result.correctAnswer === option;

                        return (
                          <div
                            key={option}
                            className={`p-3 rounded-lg border ${
                              isCorrectAnswer
                                ? "bg-green-50 border-green-200"
                                : isUserAnswer && !isCorrectAnswer
                                ? "bg-red-50 border-red-200"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                                  isCorrectAnswer
                                    ? "bg-green-600 text-white"
                                    : isUserAnswer && !isCorrectAnswer
                                    ? "bg-red-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {option}
                              </span>
                              <span className="text-sm font-medium text-gray-900 flex-1">
                                {optionText}
                              </span>
                              {isCorrectAnswer && (
                                <FaCheckCircle className="text-green-600 text-sm" />
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <FaTimesCircle className="text-red-600 text-sm" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {question.detailsExplanation && (
                      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          Explanation:
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {question.detailsExplanation}
                        </p>
                      </div>
                    )}

                    {question.videoLink && (
                      <div className="mt-4">
                        <a
                          href={question.videoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          Watch Video Explanation →
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="md" onClick={handleBackToList}>
              Back to Tests
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setIsTestSubmitted(false);
                setResults(null);
                setAnswers({});
                setCurrentQuestionIndex(0);
                setMarkedForReview(new Set());
                const durationSeconds = parseDuration(test.duration);
                if (durationSeconds) {
                  setTimeRemaining(durationSeconds);
                }
              }}
            >
              Retake Test
            </Button>
          </div>
        </div>
      );
    }

    // Show pre-test start screen if test is not started
    if (!isTestStarted) {
      return (
        <Card variant="standard" hover={false} className="overflow-hidden">
          {/* TITLE */}
          <div className="p-6 text-center border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {test.name}
            </h1>
            <p className="text-sm text-gray-500">
              Let&apos;s boost your preparation today 🚀
            </p>
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 text-center border-b border-gray-200">
            <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Duration</p>
              <p className="text-lg font-semibold text-gray-900">
                {test.duration}
              </p>
            </div>
            <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Questions</p>
              <p className="text-lg font-semibold text-gray-900">
                {questions.length}
              </p>
            </div>
            <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Max Marks</p>
              <p className="text-lg font-semibold text-gray-900">
                {test.maximumMarks}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-1">Negative</p>
              <p className="text-lg font-semibold text-gray-900">
                {test.negativeMarks}
              </p>
            </div>
          </div>

          {/* INSTRUCTIONS */}
          <div className="p-6">
            <Card variant="gradient" hover={false} className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Important Instructions
              </h3>
              <ul className="text-sm text-gray-700 space-y-2 leading-relaxed">
                {(test.description?.trim()
                  ? test.description.split("\n").map((line) => line.trim())
                  : [
                      "Read each question carefully.",
                      "You may navigate between questions anytime.",
                      'Use "Mark for Review" for doubtful questions.',
                      test.duration
                        ? `Complete the test within ${test.duration}.`
                        : "No time limit.",
                      test.negativeMarks > 0
                        ? `Each incorrect answer deducts ${test.negativeMarks} marks.`
                        : "No negative marking.",
                      "Review answers before final submission.",
                    ]
                ).map((line, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-0.5 text-gray-400">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* ACTION BUTTONS */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-center gap-3">
            <Button variant="outline" size="md" onClick={handleBackToList}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleStartTest}
              className="flex items-center justify-center gap-2"
            >
              <FaCheck className="text-xs" />
              Start Test
            </Button>
          </div>
        </Card>
      );
    }

    // Test taking interface
    const currentQuestion = questions[currentQuestionIndex];
    const answeredCount = Object.values(answers).filter(
      (a) => a !== null
    ).length;
    const markedCount = markedForReview.size;
    const unansweredCount = questions.length - answeredCount;

    return (
      <div className="space-y-2">
        {/* Registration Modal - Only show when not in results view */}
        {!isAuthenticated && !isTestSubmitted && (
          <TestSubmissionRegistrationModal
            isOpen={showRegistrationModal && !isAuthenticated}
            onClose={() => {
              setShowRegistrationModal(false);
            }}
            onRegistrationSuccess={handleRegistrationSuccess}
            testName={test?.name}
          />
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 h-screen">
            <Card
              variant="premium"
              hover={false}
              className="max-w-md w-full mx-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Submit Test?
                </h3>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {unansweredCount > 0 ? (
                    <>
                      You have{" "}
                      <strong className="font-semibold text-gray-900">
                        {unansweredCount}
                      </strong>{" "}
                      unanswered{" "}
                      {unansweredCount === 1 ? "question" : "questions"}. After
                      you submit, you can&apos;t edit this test. Do you want to
                      continue?
                    </>
                  ) : (
                    <>
                      You have answered all {answeredCount}{" "}
                      {answeredCount === 1 ? "question" : "questions"}. After
                      you submit, you can&apos;t edit this test. Do you want to
                      continue?
                    </>
                  )}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Keep working
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleSubmitTest(false)}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  Submit
                </Button>
              </div>
            </Card>
          </div>
        )}
        {/* Test Header */}
        <div className="p-4 bg-white sticky top-0 z-10 border-b border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900 mb-2">
                {test.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span>•</span>
                <span>{answeredCount} Answered</span>
                {markedCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{markedCount} Marked</span>
                  </>
                )}
              </div>
            </div>

            {timeRemaining !== null && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  timeRemaining < 300
                    ? "bg-red-50 border-red-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <FaClock
                  className={`text-sm ${
                    timeRemaining < 300 ? "text-red-600" : "text-gray-600"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    timeRemaining < 300 ? "text-red-600" : "text-gray-900"
                  }`}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT: QUESTION PANEL */}
          <Card variant="standard" hover={false} className="lg:col-span-3 p-6">
            {/* QUESTION HEADER */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
            </div>

            {/* QUESTION TEXT */}
            <div className="text-base text-gray-900 leading-relaxed mb-6">
              {currentQuestion.question}
            </div>

            {/* OPTIONS */}
            <div className="space-y-3">
              {["A", "B", "C", "D"].map((opt) => {
                const key = `option${opt}`;
                const selected = answers[currentQuestion._id] === opt;

                return (
                  <label
                    key={opt}
                    className={`
                      flex items-start gap-3 p-4 rounded-lg cursor-pointer border transition-all
                      ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                      }
                    `}
                  >
                    {/* Radio Circle */}
                    <div
                      className={`
                        w-5 h-5 rounded-full flex items-center justify-center border shrink-0 mt-0.5
                        ${
                          selected
                            ? "bg-blue-600 border-blue-700"
                            : "border-gray-400"
                        }
                      `}
                    >
                      {selected && <FaCheck className="text-white text-xs" />}
                    </div>

                    {/* Option Text */}
                    <span className="text-sm text-gray-900 flex-1 leading-relaxed">
                      {currentQuestion[key]}
                    </span>

                    {/* Option Letter */}
                    <span className="text-xs text-gray-500 font-medium shrink-0">
                      {opt}
                    </span>

                    <input
                      type="radio"
                      checked={selected}
                      onChange={() =>
                        handleAnswerSelect(currentQuestion._id, opt)
                      }
                      className="hidden"
                    />
                  </label>
                );
              })}
            </div>

            {/* BOTTOM BUTTONS */}
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
              {/* Left: Previous */}
              <Button
                variant="outline"
                size="md"
                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
                className="disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </Button>

              {/* Middle: Mark / Marked */}
              <button
                type="button"
                onClick={() => handleToggleMarked(currentQuestion._id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors
                  ${
                    markedForReview.has(currentQuestion._id)
                      ? "border-yellow-400 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                      : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
              >
                <FaFlag
                  className={`text-xs ${
                    markedForReview.has(currentQuestion._id)
                      ? "text-yellow-500"
                      : "text-gray-500"
                  }`}
                />
                {markedForReview.has(currentQuestion._id)
                  ? "Marked for Review"
                  : "Mark for Review"}
              </button>

              {/* Right: Next */}
              <Button
                variant="outline"
                size="md"
                onClick={() => goToQuestion(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === questions.length - 1}
                className="disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </Button>
            </div>
          </Card>

          {/* RIGHT: SIDEBAR */}
          <div className="space-y-4 sticky top-20">
            {/* QUESTION PALETTE */}
            <Card variant="standard" hover={false} className="p-6">
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-4">
                Question Palette
              </h3>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(2rem,1fr))] gap-2">
                {questions.map((q, idx) => {
                  const ans = !!answers[q._id];
                  const mark = markedForReview.has(q._id);
                  const cur = idx === currentQuestionIndex;

                  let cls =
                    "aspect-square max-w-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium border transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2";

                  if (cur)
                    cls +=
                      " bg-blue-600 text-white border-blue-700 focus:ring-blue-600";
                  else if (ans && mark)
                    cls +=
                      " bg-purple-500 text-white border-purple-600 focus:ring-purple-500";
                  else if (ans)
                    cls +=
                      " bg-green-500 text-white border-green-600 focus:ring-green-500";
                  else if (mark)
                    cls +=
                      " bg-yellow-400 text-gray-900 border-yellow-500 focus:ring-yellow-400";
                  else
                    cls +=
                      "w-8 h-8 bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 focus:ring-gray-400";

                  return (
                    <button
                      key={q._id}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      className={cls}
                      aria-current={cur ? "page" : undefined}
                      aria-label={`Question ${idx + 1}${
                        mark ? " marked for review" : ""
                      }${ans ? " answered" : ""}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* LEGEND */}
            <Card variant="standard" hover={false} className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  <span className="text-xs text-gray-600">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-blue-600"></span>
                  <span className="text-xs text-gray-600">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-yellow-400"></span>
                  <span className="text-xs text-gray-600">Marked</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-purple-500"></span>
                  <span className="text-xs text-gray-600">
                    Answered + Marked
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-gray-200 border border-gray-400"></span>
                  <span className="text-xs text-gray-600">Not Answered</span>
                </div>
              </div>
            </Card>

            {/* SUBMIT BUTTON */}
            <Button
              variant="primary"
              size="md"
              onClick={handleShowSubmitModal}
              fullWidth
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Submit Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show test list
  if (groupedData.length === 0 && !isLoading) {
    return (
      <Card variant="standard" hover={false} className="p-6 text-center">
        <FaFileAlt className="text-4xl text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Practice Categories Available
        </h3>
        <p className="text-sm text-gray-600">
          There are no practice categories available for this section yet. Check
          back later!
        </p>
      </Card>
    );
  }

  // Show practice test list
  return (
    <div className="space-y-4">
      {groupedData.map((group, groupIndex) => (
        <Card
          key={groupIndex}
          variant="standard"
          hover={true}
          className="overflow-hidden"
        >
          {/* TABLE FOR DESKTOP */}
          <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full table-fixed">
              {/* FIXED HEADER */}
              <thead className="bg-blue-50 border-b border-gray-200">
                <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {/* Column 1 */}
                  <th className="px-4 py-3 text-left w-[28%] text-sm text-blue-900">
                    {group.category.name}
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
                {group.tests.map((test, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-all">
                    {/* Col 1 */}
                    <td className="px-4 py-3 w-[28%]">
                      <div className="text-sm font-medium text-gray-900">
                        <span className="mr-1">{test.orderNumber}.</span>
                        {test.name}
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

                    {/* Col 5 */}
                    <td className="px-3 py-3 text-center text-sm text-gray-500 w-[12%]">
                      –
                    </td>

                    {/* Col 6 */}
                    <td className="px-3 py-3 text-right w-[13%]">
                      {(() => {
                        const testId = String(test._id || test.id);
                        const score = studentScores[testId];
                        const hasScore =
                          score &&
                          score.totalMarks !== undefined &&
                          score.totalMarks !== null &&
                          !isNaN(score.totalMarks) &&
                          score.maximumMarks !== undefined &&
                          score.maximumMarks !== null;

                        return (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedTest(test._id)}
                            className={
                              hasScore
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : ""
                            }
                          >
                            {hasScore ? "Retake" : "Start"}
                          </Button>
                        );
                      })()}
                    </td>

                    {/* Col 7 - My Score */}
                    <td className="px-4 py-3 text-right w-[13%]">
                      {(() => {
                        const testId = String(test._id || test.id);
                        const score = studentScores[testId];

                        if (
                          score &&
                          score.totalMarks !== undefined &&
                          score.totalMarks !== null &&
                          !isNaN(score.totalMarks) &&
                          score.maximumMarks !== undefined &&
                          score.maximumMarks !== null
                        ) {
                          return (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {parseFloat(score.totalMarks).toFixed(1)}/
                                {score.maximumMarks}
                              </span>
                              <span className="text-xs text-gray-500">
                                {parseFloat(score.percentage || 0).toFixed(1)}%
                              </span>
                            </div>
                          );
                        }

                        return (
                          <span className="text-gray-500 text-sm">NA</span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW */}
          <div className="md:hidden divide-y divide-gray-200">
            {group.tests.map((test, i) => (
              <div key={i} className="px-4 py-4">
                {/* Show category name ONLY for the first test */}
                {i === 0 && (
                  <div className="text-sm font-bold text-blue-900 mb-3">
                    {group.category.name}
                  </div>
                )}

                {/* Paper Name */}
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  <span className="mr-1">{test.orderNumber}.</span>
                  {test.name}
                </div>

                {/* Details */}
                <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-gray-700">
                  <div>Questions: {test.numberOfQuestions || 0}</div>
                  <div>Marks: {test.maximumMarks || 0}</div>
                  <div>Duration: {test.duration || "N/A"}</div>
                  <div>Attempted: –</div>
                </div>

                {/* Button + Score */}
                <div className="flex items-center justify-between">
                  {(() => {
                    const testId = String(test._id || test.id);
                    const score = studentScores[testId];
                    const hasScore =
                      score &&
                      score.totalMarks !== undefined &&
                      score.totalMarks !== null &&
                      !isNaN(score.totalMarks) &&
                      score.maximumMarks !== undefined &&
                      score.maximumMarks !== null;

                    return (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedTest(test._id)}
                        className={
                          hasScore ? "bg-emerald-600 hover:bg-emerald-700" : ""
                        }
                      >
                        {hasScore ? "Retake" : "Start"}
                      </Button>
                    );
                  })()}

                  {(() => {
                    const testId = String(test._id || test.id);
                    const score = studentScores[testId];

                    if (
                      score &&
                      score.totalMarks !== undefined &&
                      score.totalMarks !== null &&
                      !isNaN(score.totalMarks) &&
                      score.maximumMarks !== undefined &&
                      score.maximumMarks !== null
                    ) {
                      return (
                        <div className="text-right">
                          <div className="text-sm font-semibold text-indigo-600">
                            {parseFloat(score.totalMarks).toFixed(1)}/
                            {score.maximumMarks}
                          </div>
                          <div className="text-xs text-gray-500">
                            {parseFloat(score.percentage || 0).toFixed(1)}%
                          </div>
                        </div>
                      );
                    }

                    return <div className="text-sm text-gray-500">NA</div>;
                  })()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PracticeTestList;

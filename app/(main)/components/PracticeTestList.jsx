"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  FaEye,
  FaQuestionCircle,
} from "react-icons/fa";
import {
  fetchPracticeTests,
  fetchPracticeCategories,
  fetchPracticeTestById,
  fetchPracticeTestQuestions,
  saveTestResult,
  fetchStudentTestResults,
} from "../lib/api";
import loadMathJax from "../lib/utils/mathJaxLoader";
import LoadingState from "./LoadingState";
import TestSubmissionRegistrationModal from "./TestSubmissionRegistrationModal";
import Card from "./Card";
import Button from "./Button";
import { toTitleCase } from "../../../utils/titleCase";
import { logger } from "@/utils/logger";
import { marked } from "marked";
import DOMPurify from "dompurify";
import RichContent from "./RichContent";
import { useStudent } from "../hooks/useStudent";

// Default test settings if not provided by admin
const DEFAULT_MARKS_PER_QUESTION = 4;
const DEFAULT_NEGATIVE_MARKS = 1;
const DEFAULT_SECONDS_PER_QUESTION = 30;

const PracticeTestList = ({
  examId,
  subjectId,
  unitId,
  chapterId,
  topicId,
  subTopicId,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
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

  // Authentication and registration state - use useStudent hook for consistent auth handling
  const { isAuthenticated: isAuthFromHook } = useStudent();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [pendingTestResults, setPendingTestResults] = useState(null);
  const [studentScores, setStudentScores] = useState({}); // testId -> best score

  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const contentRef = useRef(null); // Ref for MathJax typesetting
  const isSavingTestResultRef = useRef(false); // Prevent duplicate saves
  const savedTestResultIdsRef = useRef(new Set()); // Track saved test result IDs to prevent duplicates
  const isSubmittingTestRef = useRef(false); // Prevent duplicate test submissions

  // Sync authentication state from useStudent hook
  useEffect(() => {
    setIsAuthenticated(isAuthFromHook);
  }, [isAuthFromHook]);

  // Listen for storage changes and login events to refresh scores
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "student_token") {
        // Check if user just logged in
        const token = localStorage.getItem("student_token");
        if (token && !isAuthenticated) {
          setIsAuthenticated(true);
          // Refresh scores after a short delay to ensure token is set
          if (practiceTests.length > 0) {
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
        // Refresh scores after login
        if (practiceTests.length > 0) {
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
  }, [isAuthenticated, practiceTests.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Add a small delay to ensure component is ready
      const timer = setTimeout(() => {
        fetchStudentScores();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setStudentScores({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, practiceTests.length]);

  // Refresh scores when tab becomes active (detected via URL param)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "practice" && isAuthenticated && practiceTests.length > 0) {
      // User switched to practice tab, refresh scores
      const timer = setTimeout(() => {
        fetchStudentScores();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated, practiceTests.length]);

  // Refresh scores when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated && practiceTests.length > 0) {
        // Small delay to ensure component is ready
        setTimeout(() => {
          fetchStudentScores();
        }, 300);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, practiceTests.length]);

  const handleOpenTest = (testItem) => {
    const currentSlug = testItem.slug || String(testItem._id || testItem.id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("test", currentSlug);
    params.delete("view"); // Remove view param when starting new test
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    // setSelectedTest will be updated by the useEffect above
  };

  // Handle viewing test results - shows results page directly, not paper page
  const handleViewResult = React.useCallback(async (testItem) => {
    if (!isAuthenticated) {
      alert("Please login to view test results");
      return;
    }
    
    const currentSlug = testItem.slug || String(testItem._id || testItem.id);
    const testId = String(testItem._id || testItem.id);
    
    try {
      setIsLoadingTest(true);
      setError(null);

      // IMPORTANT: Update URL first with view=results parameter
      const params = new URLSearchParams(searchParams.toString());
      params.set("test", currentSlug);
      params.set("view", "results");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      // IMPORTANT: Set states first to prevent showing paper page
      setIsTestStarted(false);
      setIsTestSubmitted(false); // Will be set to true after loading results
      setResults(null); // Clear any existing results

      // Fetch test data
      const testData = await fetchPracticeTestById(currentSlug);
      if (!testData) {
        setError("Practice test not found");
        setIsLoadingTest(false);
        return;
      }

      // Fetch questions
      const questionsData = await fetchPracticeTestQuestions(testData._id || testData.id);
      
      // Fetch latest test result
      const testResult = await fetchStudentTestResults(testId);
      
      if (!testResult) {
        setError("Test result not found. Please take the test first.");
        setIsLoadingTest(false);
        return;
      }

      console.log("Loading test result:", {
        testId,
        testResult,
        hasQuestionResults: !!testResult.questionResults,
        questionResultsLength: testResult.questionResults?.length || 0,
      });

      // Set test and questions
      const enrichedTest = {
        ...testData,
        _id: testData._id || testData.id,
        id: testData.id || testData._id,
        maximumMarks: testData.maximumMarks || (questionsData.length * DEFAULT_MARKS_PER_QUESTION),
        negativeMarks: testData.negativeMarks || DEFAULT_NEGATIVE_MARKS,
        duration: testData.duration || (questionsData.length > 0 ? `${Math.ceil((questionsData.length * DEFAULT_SECONDS_PER_QUESTION) / 60)} Min` : "0 Min")
      };

      setTest(enrichedTest);
      setQuestions(questionsData);

      // Reconstruct answers from test result
      // Handle both Map and plain object formats
      const reconstructedAnswers = {};
      if (testResult.answers) {
        if (testResult.answers instanceof Map) {
          testResult.answers.forEach((value, key) => {
            reconstructedAnswers[String(key)] = value;
          });
        } else if (typeof testResult.answers === 'object') {
          Object.keys(testResult.answers).forEach((questionId) => {
            reconstructedAnswers[questionId] = testResult.answers[questionId];
          });
        }
      }
      setAnswers(reconstructedAnswers);

      // Set results from test result - ensure questionResults is properly formatted
      const questionResults = Array.isArray(testResult.questionResults) 
        ? testResult.questionResults 
        : [];

      console.log("Setting results:", {
        totalQuestions: testResult.totalQuestions || questionsData.length,
        correctCount: testResult.correctCount || 0,
        incorrectCount: testResult.incorrectCount || 0,
        questionResultsCount: questionResults.length,
      });

      // CRITICAL: Set results BEFORE setting isTestSubmitted to true
      setResults({
        totalQuestions: testResult.totalQuestions || questionsData.length,
        correctCount: testResult.correctCount || 0,
        incorrectCount: testResult.incorrectCount || 0,
        unansweredCount: testResult.unansweredCount || 0,
        totalMarks: testResult.totalMarks || 0,
        maximumMarks: testResult.maximumMarks || enrichedTest.maximumMarks,
        percentage: testResult.percentage || 0,
        questionResults: questionResults,
        timeTaken: testResult.timeTaken || 0,
      });

      // CRITICAL: Set these states LAST to ensure results view shows
      setIsTestSubmitted(true);
      setIsTestStarted(false);
      
      console.log("Results view should now be displayed");
      
      // Scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 200);
    } catch (err) {
      logger.error("Error loading test result:", err);
      console.error("Error details:", err);
      setError("Failed to load test result. Please try again.");
    } finally {
      setIsLoadingTest(false);
    }
  }, [isAuthenticated, searchParams, pathname, router]);

  // Sync selectedTest with URL param and handle view=results
  useEffect(() => {
    const testSlug = searchParams.get("test");
    const viewMode = searchParams.get("view");
    
    if (testSlug && testSlug !== selectedTest) {
      setSelectedTest(testSlug);
      
      // If view=results, trigger result view loading
      // Check both isAuthenticated and token to handle page refresh cases
      const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
      const isAuth = isAuthenticated || !!token;
      
      if (viewMode === "results" && isAuth) {
        const loadTestResult = async () => {
          try {
            setIsLoadingTest(true);
            setError(null);
            
            // First, try to find the test item from practiceTests
            let testItem = practiceTests.find(
              (t) => String(t._id || t.id) === testSlug || t.slug === testSlug
            );
            
            // If not found in practiceTests, fetch it directly by ID/slug
            // This handles cases where:
            // 1. Test is from a different hierarchy level (Performance tab)
            // 2. Page was refreshed and practiceTests might not be loaded yet
            // 3. Test is not in the current page's practiceTests list
            if (!testItem) {
              console.log("Test not found in practiceTests, fetching directly:", testSlug);
              const fetchedTest = await fetchPracticeTestById(testSlug);
              if (fetchedTest) {
                console.log("Test fetched successfully:", fetchedTest._id || fetchedTest.id);
                // Create a testItem-like object from fetched test
                testItem = {
                  _id: fetchedTest._id || fetchedTest.id,
                  id: fetchedTest.id || fetchedTest._id,
                  slug: fetchedTest.slug || String(fetchedTest._id || fetchedTest.id),
                  ...fetchedTest
                };
              } else {
                console.error("Failed to fetch test:", testSlug);
                setError("Practice test not found");
                setIsLoadingTest(false);
                return;
              }
            } else {
              console.log("Test found in practiceTests:", testItem._id || testItem.id);
            }
            
            // Now call handleViewResult with the testItem (either from practiceTests or fetched)
            if (testItem) {
              await handleViewResult(testItem);
            }
          } catch (err) {
            logger.error("Error loading test result from URL:", err);
            console.error("Error details:", err);
            setError("Failed to load test result. Please try again.");
            setIsLoadingTest(false);
          }
        };
        
        // Small delay to ensure component is ready and practiceTests might be loading
        // But don't wait too long - if practiceTests is empty, fetch directly
        setTimeout(() => {
          loadTestResult();
        }, practiceTests.length === 0 ? 100 : 200);
      }
    } else if (!testSlug && selectedTest) {
      // Only clear if we were not already in the middle of a test
      // or if the user explicitly navigated away
      setSelectedTest(null);
      setTest(null);
      setQuestions([]);
      setIsTestStarted(false);
      setIsTestSubmitted(false);
      setResults(null);
    }
  }, [searchParams, selectedTest, isAuthenticated, practiceTests, handleViewResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if content is HTML (from RichTextEditor) or markdown
  const isHTML = (text = "") => {
    if (!text) return false;
    // Check if text contains HTML tags
    const htmlTagRegex = /<[^>]+>/;
    return htmlTagRegex.test(text);
  };

  // Render content - handles both HTML (from RichTextEditor) and markdown
  const renderContent = (text = "") => {
    if (!text) return "";
    
    // If content is already HTML (from RichTextEditor), sanitize and return
    if (isHTML(text)) {
      return DOMPurify.sanitize(text);
    }
    
    // Otherwise, treat as markdown and parse
    const html = marked.parse(text);
    return DOMPurify.sanitize(html);
  };

  // Helper to render names (handles HTML from editor + Title Case for plain text)
  const renderFormattedName = (name) => {
    if (!name) return "";
    // If it contains HTML tags, render as is (dangerouslySetInnerHTML will be used)
    if (/<[a-z][\s\S]*>/i.test(name)) {
      return name;
    }
    // Otherwise apply title case
    return toTitleCase(name);
  };

  // Handle SEO Meta Data when test is open
  useEffect(() => {
    if (test) {
      // Update Title
      const originalTitle = document.title;
      // Use SEO Title if available, otherwise use paper name
      const seoTitle = test.seoData?.metaTitle || test.name;
      document.title = `${seoTitle} - Practice Test`;

      // Update Description if available
      let metaDesc = document.querySelector('meta[name="description"]');
      const originalDesc = metaDesc ? metaDesc.getAttribute("content") : "";

      if (test.seoData?.metaDescription) {
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute("name", "description");
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute("content", test.seoData.metaDescription);
      }

      return () => {
        document.title = originalTitle;
        if (metaDesc && originalDesc) {
          metaDesc.setAttribute("content", originalDesc);
        }
      };
    }
  }, [test]);

  // Handle MathJax typesetting when content changes
  useEffect(() => {
    if (typeof window !== "undefined" && (isTestStarted || isTestSubmitted) && contentRef.current) {
      loadMathJax().then((MathJaxInstance) => {
        if (MathJaxInstance && MathJaxInstance.Hub) {
          MathJaxInstance.Hub.Queue(["Typeset", MathJaxInstance.Hub, contentRef.current]);
        }
      }).catch(err => console.error("MathJax load error:", err));
    }
  }, [currentQuestionIndex, isTestStarted, isTestSubmitted, results, questions]);

  // Scroll to top when test starts
  useEffect(() => {
    if (isTestStarted && questions.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
    }
  }, [isTestStarted, questions.length]);

  // Close registration modal if user logs in from another tab
  useEffect(() => {
    if (isAuthenticated && showRegistrationModal) {
      setShowRegistrationModal(false);
    }
    // NOTE: Test results saving is handled in handleRegistrationSuccess to prevent duplicates
  }, [isAuthenticated, showRegistrationModal]);

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

        // NEW LOGIC: Fetch all tests for the categories and implement "Smart Priority"
        // This ensures the student sees everything related, but with perfect sorting.
        const allTests = [];
        for (const category of categories) {
          const categoryId = category._id || category.id;
          if (categoryId) {
            const categoryFilters = cleanFilters({
              categoryId,
              status: "active",
            });
            // Fetch by CategoryId ONLY to get all papers in this category across all levels
            const categoryTests = await fetchPracticeTests(categoryFilters);
            if (categoryTests && categoryTests.length > 0) {
              allTests.push(...categoryTests);
            }
          }
        }

        // Calculate relevance priority for each test
        // Priority system: Current level → Nearest parent with tests → All others
        const getPriority = (test) => {
          const tUnitId = test.unitId?._id || test.unitId;
          const tChapterId = test.chapterId?._id || test.chapterId;
          const tTopicId = test.topicId?._id || test.topicId;
          const tSubTopicId = test.subTopicId?._id || test.subTopicId;
          const tSubjectId = test.subjectId?._id || test.subjectId;

          const sUnitId = unitId ? String(unitId) : null;
          const sChapterId = chapterId ? String(chapterId) : null;
          const sTopicId = topicId ? String(topicId) : null;
          const sSubTopicId = subTopicId ? String(subTopicId) : null;
          const sSubjectId = subjectId ? String(subjectId) : null;
          const sExamId = examId ? String(examId) : null;

          // Check if test is assigned to current page level
          // A test is "assigned" to a level if it has that level's ID set
          // It doesn't matter if it also has child level IDs
          let matchesCurrentLevel = false;
          
          if (sSubTopicId && String(tSubTopicId) === sSubTopicId) {
            matchesCurrentLevel = true;
          } else if (sTopicId && !sSubTopicId && String(tTopicId) === sTopicId) {
            matchesCurrentLevel = true;
          } else if (sChapterId && !sTopicId && !sSubTopicId && String(tChapterId) === sChapterId) {
            matchesCurrentLevel = true;
          } else if (sUnitId && !sChapterId && !sTopicId && !sSubTopicId && String(tUnitId) === sUnitId) {
            matchesCurrentLevel = true;
          } else if (sSubjectId && !sUnitId && !sChapterId && !sTopicId && !sSubTopicId && String(tSubjectId) === sSubjectId) {
            matchesCurrentLevel = true;
          } else if (sExamId && !sSubjectId && !sUnitId && !sChapterId && !sTopicId && !sSubTopicId) {
            const testExamId = String(test.examId?._id || test.examId);
            if (testExamId === sExamId) {
              matchesCurrentLevel = true;
            }
          }

          // Priority 1: Tests assigned to current page level (always at top)
          if (matchesCurrentLevel) {
            return 1;
          }

          // Priority 10: All other tests (parent levels and unrelated tests)
          // Show all tests below current level tests
          return 10;
        };

        // Process tests with priority
        const processedTests = allTests.map((t) => {
          const priority = getPriority(t);
          return {
            ...t,
            priority,
            isDirect: priority === 1, // Assigned to current level
            isOther: priority === 10 // All other tests
          };
        });

        // Sort: Priority 1 (current level assigned) → Priority 10 (all others)
        // Within same priority, sort by orderNumber
        processedTests.sort((a, b) => {
          // Primary sort: Priority (1 = current level at top, 10 = others below)
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          // Secondary sort: Order Number
          return (a.orderNumber || 999) - (b.orderNumber || 999);
        });

        setPracticeTests(processedTests);

        // Fetch scores after tests are loaded (if authenticated)
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("student_token");
          if (token && processedTests.length > 0) {
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
            const categoryTests = processedTests
              .filter((test) => {
                // Handle different categoryId formats
                let testCategoryId = null;

                if (test.categoryId) {
                  if (typeof test.categoryId === "object") {
                    testCategoryId = test.categoryId._id || test.categoryId.id;
                  } else {
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
              })
              .filter((test) => {
                // Filter out tests with no questions (0, null, or undefined)
                const qCount = test.numberOfQuestions;
                return qCount !== null && qCount !== undefined && qCount > 0;
              })
              .map((test) => {
                const qCount = test.numberOfQuestions || 0;
                return {
                  ...test,
                  maximumMarks: test.maximumMarks || (qCount * DEFAULT_MARKS_PER_QUESTION),
                  negativeMarks: test.negativeMarks || DEFAULT_NEGATIVE_MARKS,
                  duration: test.duration || (qCount > 0 ? `${Math.ceil((qCount * DEFAULT_SECONDS_PER_QUESTION) / 60)} Min` : "0 Min")
                };
              });
              // Note: Tests are already sorted by priority in processedTests above
              // Priority order: Current level (1) → Parent levels (2-6) → Others (10+)

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

      const viewMode = searchParams.get("view");
      
      // If view=results, don't load here - let handleViewResult handle it
      if (viewMode === "results") {
        return;
      }

      try {
        setIsLoadingTest(true);
        setError(null);

        const testData = await fetchPracticeTestById(selectedTest);

        if (!testData) {
          setError("Practice test not found");
          setIsLoadingTest(false);
          return;
        }

        // Fetch questions using the actual ID from testData, not the slug/identifier
        // This prevents the backend from falling back to "all questions" if the slug isn't a valid ObjectId
        const questionsData = await fetchPracticeTestQuestions(testData._id || testData.id);

        // Calculate and set metrics with defaults if needed
        const qCount = questionsData.length;

        // Duration: 1q/30sec if not provided
        let durationSeconds = parseDuration(testData.duration);
        if (!durationSeconds && qCount > 0) {
          durationSeconds = qCount * DEFAULT_SECONDS_PER_QUESTION;
        }

        if (durationSeconds) {
          setTimeRemaining(durationSeconds);
        }

        // Apply defaults to test data for display consistency
        // IMPORTANT: Preserve _id and id fields from testData
        const enrichedTest = {
          ...testData,
          _id: testData._id || testData.id, // Ensure _id is preserved
          id: testData.id || testData._id, // Ensure id is preserved as fallback
          maximumMarks: testData.maximumMarks || (qCount * DEFAULT_MARKS_PER_QUESTION),
          negativeMarks: testData.negativeMarks || DEFAULT_NEGATIVE_MARKS,
          duration: testData.duration || (qCount > 0 ? `${Math.ceil((qCount * DEFAULT_SECONDS_PER_QUESTION) / 60)} Min` : "0 Min")
        };

        // Log for debugging
        if (!enrichedTest._id) {
          logger.warn("Warning: testData does not have _id field", {
            testData,
            enrichedTest,
          });
        }

        setTest(enrichedTest);
        setQuestions(questionsData);

        const initialAnswers = {};
        questionsData.forEach((q) => {
          initialAnswers[q._id] = null;
        });
        setAnswers(initialAnswers);
      } catch (err) {
        logger.error("Error loading practice test:", err);
        setError("Failed to load practice test. Please try again.");
      } finally {
        setIsLoadingTest(false);
      }
    };

    loadTest();
  }, [selectedTest, searchParams]);

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

    // Update URL to include test slug
    const currentSlug = test.slug || String(test._id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("test", currentSlug);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Scroll to top of the page to show the question screen
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
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
      // Scroll to top of question content
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  // Calculate results
  const calculateResults = React.useCallback(() => {
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalMarks = 0;
    const questionResults = [];
    const qCount = questions.length;
    const testToUse = test || {};

    // Use enriched metrics for calculation
    const effectiveMaxMarks = testToUse.maximumMarks || (qCount * DEFAULT_MARKS_PER_QUESTION);
    const marksPerQuestion = qCount > 0 ? effectiveMaxMarks / qCount : 0;
    const negativeMarks = testToUse.negativeMarks || DEFAULT_NEGATIVE_MARKS;

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

    const percentage = effectiveMaxMarks > 0 ? (totalMarks / effectiveMaxMarks) * 100 : 0;

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
      // Prevent duplicate submissions - check if already submitting
      if (isSubmittingTestRef.current && !autoSubmit) {
        logger.info("Test submission already in progress, skipping duplicate");
        return;
      }

      // Mark as submitting immediately to prevent duplicates
      isSubmittingTestRef.current = true;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      setShowSubmitModal(false);
      const calculatedResults = calculateResults();
      
      // CRITICAL: Use test._id (the actual MongoDB ObjectId) instead of selectedTest (which is a slug/identifier)
      // The test object should have _id after being loaded from fetchPracticeTestById
      if (!test) {
        logger.error("Cannot save test result: test object is missing");
        alert("Error: Test information is missing. Please reload the test and try again.");
        return;
      }
      
      // Try to get _id from test object - it should always be present after loading from API
      const actualTestId = test._id || test.id;
      if (!actualTestId) {
        logger.error("Cannot save test result: test._id is missing. test object:", {
          test,
          selectedTest,
          hasId: !!test.id,
          has_id: !!test._id,
        });
        alert("Error: Test ID is missing. Please reload the test and try again.");
        return;
      }
      
      const testIdStr = String(actualTestId);
      
      // Validate testId is a valid MongoDB ObjectId format (24 hex characters)
      // This prevents sending slugs like "test-paper" instead of ObjectIds
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(testIdStr)) {
        logger.error("Invalid testId format - must be a valid MongoDB ObjectId", {
          testIdStr,
          testId: actualTestId,
          testObject: test,
          selectedTest,
        });
        alert(`Error: Invalid test ID format. Expected MongoDB ObjectId (24 hex characters), but received: "${testIdStr}". Please reload the test and try again.`);
        return;
      }

      // Always set results and mark as submitted (for display)
      setResults(calculatedResults);
      setIsTestSubmitted(true);
      setIsTestStarted(false);

      // If student is NOT logged in, show registration modal AND results page with prompt
      if (!isAuthenticated && test && testIdStr) {
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
      // Only save if not already saving and not already saved
      if (isAuthenticated && test && selectedTest && !isSavingTestResultRef.current) {
        // Create a unique key for this test submission
        const saveKey = `${testIdStr}_${startTimeRef.current || Date.now()}`;
        
        // Check if we've already saved this exact test result
        if (savedTestResultIdsRef.current.has(saveKey)) {
          logger.info("Test result already saved, skipping duplicate save");
          return;
        }

        logger.info("Attempting to save test result", {
          testId: testIdStr,
          isAuthenticated,
          hasTest: !!test,
          hasSelectedTest: !!selectedTest,
        });

        isSavingTestResultRef.current = true;
        try {
          // Prepare startedAt date - convert to ISO string if Date object
          const startedAtDate = startTimeRef.current
            ? (startTimeRef.current instanceof Date ? startTimeRef.current.toISOString() : new Date(startTimeRef.current).toISOString())
            : new Date().toISOString();

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
            answers: answers || {},
            questionResults: calculatedResults.questionResults || [],
            startedAt: startedAtDate,
          };

          // Validate required fields before sending
          if (!resultData.testId) {
            logger.error("Cannot save test result: testId is missing");
            return;
          }
          if (resultData.totalQuestions === undefined || resultData.percentage === undefined) {
            logger.error("Cannot save test result: required fields missing", {
              hasTotalQuestions: resultData.totalQuestions !== undefined,
              hasPercentage: resultData.percentage !== undefined,
            });
            return;
          }

          logger.info("Calling saveTestResult with data", {
            testId: resultData.testId,
            totalQuestions: resultData.totalQuestions,
            percentage: resultData.percentage,
            questionResultsLength: resultData.questionResults?.length || 0,
          });

          const saveResult = await saveTestResult(resultData);
          
          logger.info("saveTestResult response", {
            success: saveResult?.success,
            message: saveResult?.message,
            hasData: !!saveResult?.data,
          });

          if (saveResult && saveResult.success && saveResult.data) {
            // Mark as saved to prevent duplicates
            savedTestResultIdsRef.current.add(saveKey);
            
            logger.info("Test result saved successfully", {
              testId: testIdStr,
              resultId: saveResult.data._id,
            });
            
            // Update score immediately with saved data
            setStudentScores((prev) => ({
              ...prev,
              [testIdStr]: {
                totalMarks: saveResult.data.totalMarks,
                maximumMarks: saveResult.data.maximumMarks,
                percentage: saveResult.data.percentage,
              },
            }));
            
            // Refresh all scores to ensure consistency
            setTimeout(() => {
              fetchStudentScores();
            }, 500);
          } else {
            logger.warn("Failed to save test result", {
              success: saveResult?.success,
              message: saveResult?.message,
            });
          }
        } catch (error) {
          logger.error("Error saving test result:", {
            error: error.message,
            stack: error.stack,
            response: error.response?.data,
          });
        } finally {
          isSavingTestResultRef.current = false;
        }
      } else {
        logger.warn("Skipping save test result", {
          isAuthenticated,
          hasTest: !!test,
          hasSelectedTest: !!selectedTest,
          isSaving: isSavingTestResultRef.current,
        });
      }

      // Reset submission ref after processing
      isSubmittingTestRef.current = false;
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

  // Reset submission ref when test starts
  useEffect(() => {
    if (isTestStarted) {
      isSubmittingTestRef.current = false;
    }
  }, [isTestStarted]);

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

      // Get current pending results and clear immediately to prevent duplicate saves
      setPendingTestResults((currentPending) => {
        if (!currentPending) return null;

        // Prevent duplicate saves - check if already saving
        if (isSavingTestResultRef.current) {
          logger.info("Test result save already in progress, skipping duplicate");
          return currentPending; // Don't clear if already saving
        }

        // Create a unique key for this test submission
        const testIdStr = String(currentPending.testId);
        const saveKey = `${testIdStr}_${currentPending.startedAt || Date.now()}`;
        
        // Check if we've already saved this exact test result
        if (savedTestResultIdsRef.current.has(saveKey)) {
          logger.info("Test result already saved after registration, skipping duplicate");
          return null; // Clear pending since already saved
        }

        // Store a copy before clearing to prevent race conditions
        const resultsToSave = { ...currentPending };
        
        // Mark as saving to prevent duplicate saves
        isSavingTestResultRef.current = true;

        // Save test results asynchronously
        (async () => {
        try {
            const saveResult = await saveTestResult(resultsToSave);
          if (saveResult.success && saveResult.data) {
              // Mark as saved to prevent duplicates
              savedTestResultIdsRef.current.add(saveKey);
              
            // Update score with saved data
            setStudentScores((prev) => ({
              ...prev,
              [testIdStr]: {
                totalMarks: saveResult.data.totalMarks,
                maximumMarks: saveResult.data.maximumMarks,
                percentage: saveResult.data.percentage,
              },
            }));
            
            // Refresh all scores to ensure consistency
            setTimeout(() => {
              fetchStudentScores();
            }, 500);
          }

            // Display results after successful save
            setResults({
              totalQuestions: resultsToSave.totalQuestions,
              correctCount: resultsToSave.correctCount,
              incorrectCount: resultsToSave.incorrectCount,
              unansweredCount: resultsToSave.unansweredCount,
              totalMarks: resultsToSave.totalMarks,
              maximumMarks: resultsToSave.maximumMarks,
              percentage: resultsToSave.percentage,
              questionResults: resultsToSave.questionResults,
              timeTaken: resultsToSave.timeTaken,
            });
            setIsTestSubmitted(true);
            setIsTestStarted(false);
        } catch (error) {
            logger.error("Error saving test results after registration:", error);
            // Even if save fails, show results to user
            setResults({
              totalQuestions: resultsToSave.totalQuestions,
              correctCount: resultsToSave.correctCount,
              incorrectCount: resultsToSave.incorrectCount,
              unansweredCount: resultsToSave.unansweredCount,
              totalMarks: resultsToSave.totalMarks,
              maximumMarks: resultsToSave.maximumMarks,
              percentage: resultsToSave.percentage,
              questionResults: resultsToSave.questionResults,
              timeTaken: resultsToSave.timeTaken,
            });
            setIsTestSubmitted(true);
            setIsTestStarted(false);
          } finally {
            isSavingTestResultRef.current = false;
          }
        })();

        // Clear pending results immediately
        return null;
      });
    },
    [] // Empty dependency array - we use functional setState to access current value
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

    // Update URL to remove test slug
    const params = new URLSearchParams(searchParams.toString());
    params.delete("test");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

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
              formId="registration-practice"
            />

            {/* Login / Register Prompt Page */}
            <Card variant="none" hover={false} className="relative">
              <div className="relative z-10 p-6 md:p-8">
                {/* Lock Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-105">
                      <FaLock className="text-white text-lg md:text-xl" />
                    </div>
                    {/* Small Active Indicator */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-lg md:text-xl font-semibold text-gray-900 text-center mb-4 leading-tight">
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
                    size="sm"
                    onClick={() => setShowRegistrationModal(true)}
                    className="flex items-center gap-2"
                  >
                    <FaUser className="text-sm" />
                    Create Account
                  </Button>

                  {/* Login */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
                        const currentPath =
                          window.location.pathname + window.location.search;
                        sessionStorage.setItem(
                          "redirectAfterLogin",
                          currentPath
                        );
                        window.location.href = `${basePath}/login`;
                      }
                    }}
                    className="flex items-center gap-2 border-purple-600 text-purple-600 hover:bg-purple-50 hover:border-purple-700 hover:text-purple-700"
                  >
                    <FaLock className="text-sm" />
                    Login
                  </Button>

                  {/* Back */}
                  <Button variant="ghost" size="sm" onClick={handleBackToList}>
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
          <Card variant="none" hover={false} className="p-6">
            <div className="text-center border-b border-gray-200 pb-4">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                Test Results
              </h1>
              <div className="text-sm text-gray-600">
                <RichContent html={renderContent(renderFormattedName(test.name))} />
              </div>
            </div>
          </Card>

          {/* Score Card */}
          <Card variant="none" hover={false} className="px-6 ">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ">
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

            <div className="mt-6 pt-6 border-t border-gray-200 border-b pb-6">
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
          <Card variant="none" hover={false} className="px-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Question-wise Results
            </h2>
            <div
              ref={contentRef}
              className="space-y-6"
            >
              {results.questionResults && results.questionResults.length > 0 ? (
                results.questionResults.map((result, index) => {
                  const question = questions.find(
                    (q) => q._id === result.questionId || String(q._id) === String(result.questionId)
                  );
                  
                  // If question not found in questionResults, try to find by index
                  const questionByIndex = question || questions[index];
                  
                  if (!questionByIndex) {
                    console.warn("Question not found for result:", result);
                    return null;
                  }
                  
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
                        <div className="text-base font-semibold text-gray-900 rich-text-content">
                          <RichContent html={renderContent(result.question)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {result.isCorrect ? (
                          <FaCheckCircle className="text-green-600 text-xl" />
                        ) : (
                          <FaTimesCircle className="text-red-600 text-xl" />
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${result.isCorrect
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
                        const optionText = questionByIndex[optionKey];
                        const isUserAnswer = result.userAnswer === option;
                        const isCorrectAnswer = result.correctAnswer === option;

                        return (
                          <div
                            key={option}
                            className={`p-3 rounded-lg border ${isCorrectAnswer
                              ? "bg-green-50 border-green-200"
                              : isUserAnswer && !isCorrectAnswer
                                ? "bg-red-50 border-red-200"
                                : "bg-white border-gray-200"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${isCorrectAnswer
                                  ? "bg-green-600 text-white"
                                  : isUserAnswer && !isCorrectAnswer
                                    ? "bg-red-600 text-white"
                                    : "bg-gray-200 text-gray-700"
                                  }`}
                              >
                                {option}
                              </span>
                              <div className="text-sm font-medium text-gray-900 flex-1 rich-text-content">
                                <RichContent html={renderContent(optionText)} />
                              </div>
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

                    {questionByIndex.detailsExplanation && (
                      <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          Explanation:
                        </h4>
                        <div className="text-sm text-gray-600 leading-relaxed rich-text-content">
                          <RichContent html={renderContent(questionByIndex.detailsExplanation)} />
                        </div>
                      </div>
                    )}

                    {questionByIndex.videoLink && (
                      <div className="mt-4">
                        <a
                          href={questionByIndex.videoLink}
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
                })
              ) : (
                // Fallback: Show questions from questions array if questionResults is empty
                questions.map((question, index) => {
                  const userAnswer = answers[question._id];
                  const correctAnswer = question.answer;
                  const isCorrect = userAnswer && userAnswer.toUpperCase() === correctAnswer.toUpperCase();
                  
                  return (
                    <div
                      key={question._id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full font-medium bg-white text-gray-900 border border-gray-300 text-xs">
                            {index + 1}
                          </span>
                          <div className="text-base font-semibold text-gray-900 rich-text-content">
                            <RichContent html={renderContent(question.question)} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isCorrect ? (
                            <FaCheckCircle className="text-green-600 text-xl" />
                          ) : userAnswer ? (
                            <FaTimesCircle className="text-red-600 text-xl" />
                          ) : (
                            <FaQuestionCircle className="text-gray-400 text-xl" />
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isCorrect
                                ? "bg-green-100 text-green-800"
                                : userAnswer
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {isCorrect ? "+" : userAnswer ? "-" : "0"} marks
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {["A", "B", "C", "D"].map((option) => {
                          const optionKey = `option${option}`;
                          const optionText = question[optionKey];
                          const isUserAnswer = userAnswer === option;
                          const isCorrectAnswer = correctAnswer === option;

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
                                <div className="text-sm font-medium text-gray-900 flex-1 rich-text-content">
                                  <RichContent html={renderContent(optionText)} />
                                </div>
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
                          <div className="text-sm text-gray-600 leading-relaxed rich-text-content">
                            <RichContent html={renderContent(question.detailsExplanation)} />
                          </div>
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
                })
              )}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 mb-4">
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
        <Card variant="none" hover={false} className="overflow-hidden">
          {/* TITLE */}
          <div className="p-6 text-center border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              <RichContent html={renderContent(renderFormattedName(test.name))} />
            </h1>
            <p className="text-sm text-gray-500">
              Let&apos;s boost your preparation today
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
            <Card variant="none" hover={false} className="p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Important Instructions
              </h3>
              {test.description?.trim() ? (
                // If description exists, check if it's HTML
                isHTML(test.description) ? (
                  // If HTML, render directly with RichContent (preserves lists, formatting, etc.)
                  <div className="text-sm text-gray-700 leading-relaxed rich-text-content">
                    <RichContent html={renderContent(test.description)} />
                  </div>
                ) : (
                  // If plain text, split by newlines and render as list
                  <ul className="text-sm text-gray-700 space-y-2 leading-relaxed">
                    {test.description.split("\n").map((line, index) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) return null;
                      return (
                        <li key={index} className="flex gap-2">
                          <div className="rich-text-content">
                            <RichContent html={renderContent(trimmedLine)} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                // Default instructions if no description
                <ul className="text-sm text-gray-700 space-y-2 leading-relaxed">
                  {[
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
                  ].map((line, index) => (
                    <li key={index} className="flex gap-2">
                      <div className="rich-text-content">
                        <RichContent html={renderContent(line)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* ACTION BUTTONS */}
          <div className="px-6 py-4 border-t border-gray-200  flex flex-col md:flex-row justify-center gap-3">
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
            formId="registration-practice"
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
        <div className="p-4 bg-white sticky top-0 z-10 border-b border-gray-200 ">
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${timeRemaining < 300
                  ? "bg-red-50 border-red-200"
                  : "bg-gray-50 border-gray-200"
                  }`}
              >
                <FaClock
                  className={`text-sm ${timeRemaining < 300 ? "text-red-600" : "text-gray-600"
                    }`}
                />
                <span
                  className={`text-sm font-semibold ${timeRemaining < 300 ? "text-red-600" : "text-gray-900"
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
          <Card variant="none" hover={false} className="lg:col-span-3 p-6">
            <div ref={contentRef}>
              {/* QUESTION HEADER */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
              </div>

              {/* QUESTION TEXT */}
              <div className="text-base text-gray-900 leading-relaxed mb-6 rich-text-content">
                <RichContent html={renderContent(currentQuestion.question)} />
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
                      ${selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                        }
                    `}
                    >
                      {/* Radio Circle */}
                      <div
                        className={`
                        w-5 h-5 rounded-full flex items-center justify-center border shrink-0 mt-0.5
                        ${selected
                            ? "bg-blue-600 border-blue-700"
                            : "border-gray-400"
                          }
                      `}
                      >
                        {selected && <FaCheck className="text-white text-xs" />}
                      </div>

                      {/* Option Text */}
                      <span
                        className="text-sm text-gray-900 flex-1 leading-relaxed rich-text-content"
                        dangerouslySetInnerHTML={{ __html: currentQuestion[key] }}
                      />

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
                  ${markedForReview.has(currentQuestion._id)
                    ? "border-yellow-400 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                    : "border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
              >
                <FaFlag
                  className={`text-xs ${markedForReview.has(currentQuestion._id)
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
            <Card variant="none" hover={false} className="p-6">
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-4 border-b border-gray-200 pb-2">
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
                      aria-label={`Question ${idx + 1}${mark ? " marked for review" : ""
                        }${ans ? " answered" : ""}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* LEGEND */}
            <Card variant="none" hover={false} className=" p-6">
              <div className="border-y border-gray-200 py-3">
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
              className="mb-4"
            >
              Submit Test
            </Button>
          </div >
        </div >
      </div >
    );
  }

  // Show test list
  if (groupedData.length === 0 && !isLoading) {
    return (
      <Card variant="none" hover={false} className="p-6 text-center">
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
          variant="none"
          hover={true}
          className="overflow-hidden border-none "
        >
          {/* TABLE FOR DESKTOP */}
          <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full table-fixed">
              {/* FIXED HEADER */}
              <thead className="bg-blue-50 border-b border-gray-200">
                <tr className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {/* Column 1 */}
                  <th
                    className="px-4 py-3 text-left w-[28%] text-sm text-blue-900"
                    >
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
                      <div className="text-sm font-medium text-gray-900 flex ">
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

                    {/* Col 5 - Attempted */}
                    <td className="px-3 py-3 text-center text-sm w-[12%]">
                      {(() => {
                        const testId = String(test._id || test.id);
                        const score = studentScores[testId];
                        const hasAttempted = 
                          score &&
                          score.totalMarks !== undefined &&
                          score.totalMarks !== null &&
                          !isNaN(score.totalMarks);
                        
                        return hasAttempted ? (
                          <span className="text-green-600 font-medium">Attempted</span>
                        ) : (
                          <span className="text-gray-500">–</span>
                        );
                      })()}
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
                  <div
                    className="text-sm font-bold text-blue-900 mb-3"
                    dangerouslySetInnerHTML={{ __html: renderFormattedName(group.category.name) }}
                  />
                )}

                {/* Paper Name */}
                <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-1">{test.orderNumber}.</span>
                  <span dangerouslySetInnerHTML={{ __html: renderFormattedName(test.name) }} />
                </div>

                {/* Details */}
                <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-gray-700">
                  <div>Questions: {test.numberOfQuestions || 0}</div>
                  <div>Marks: {test.maximumMarks || 0}</div>
                  <div>Duration: {test.duration || "N/A"}</div>
                  <div>
                    Attempted: {(() => {
                      const testId = String(test._id || test.id);
                      const score = studentScores[testId];
                      const hasAttempted = 
                        score &&
                        score.totalMarks !== undefined &&
                        score.totalMarks !== null &&
                        !isNaN(score.totalMarks);
                      
                      return hasAttempted ? (
                        <span className="text-green-600 font-medium">Attempted</span>
                      ) : (
                        <span className="text-gray-500">–</span>
                      );
                    })()}
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
                        (() => {
                          const testId = String(test._id || test.id);
                          const score = studentScores[testId];
                          const hasScore =
                            score &&
                            score.totalMarks !== undefined &&
                            score.totalMarks !== null &&
                            !isNaN(score.totalMarks) &&
                            score.maximumMarks !== undefined &&
                            score.maximumMarks !== null;
                          return hasScore ? "bg-emerald-600 hover:bg-emerald-700" : "";
                        })()
                      }
                    >
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
                        return hasScore ? "Retake" : "Start";
                      })()}
                    </Button>
                  </div>

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

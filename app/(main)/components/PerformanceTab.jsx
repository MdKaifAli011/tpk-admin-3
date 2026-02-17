"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  FaChartLine,
  FaTrophy,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaQuestionCircle,
  FaMinus,
  FaCalendarAlt,
  FaAward,
  FaFire,
  FaUser,
  FaUserPlus,
  FaLock,
  FaEye,
} from "react-icons/fa";
import { fetchAllStudentTestResults } from "../lib/api";
import { useStudent } from "../hooks/useStudent";
import Button from "./Button";
import Card from "./Card";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";
const authHref = (pathname, target) => {
  if (!pathname || pathname.includes("/login") || pathname.includes("/register")) return target;
  const pathOnly = pathname.startsWith(basePath) ? pathname.slice(basePath.length) || "/" : pathname;
  return `${target}?redirect=${encodeURIComponent(pathOnly)}`;
};

const PerformanceTab = ({
  entityType,
  entityName,
  examId,
  subjectId,
  unitId,
  chapterId,
  topicId,
  subTopicId,
}) => {
  const { isAuthenticated } = useStudent();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle viewing test result
  const handleViewResult = (result) => {
    if (!result.testId) return;
    
    // Get test ID - handle both populated object and string
    const testId = typeof result.testId === "object" 
      ? result.testId._id || result.testId.id 
      : result.testId;
    
    if (!testId) return;

    // Navigate to practice tab with test and view=results
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "practice");
    params.set("test", String(testId));
    params.set("view", "results");
    
    // Navigate first
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Scroll to top after navigation (with delay to ensure page is ready)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  };

  // Fetch test results based on entity hierarchy
  // Fetch at exam level to show all test results for that exam (not too strict filtering)
  useEffect(() => {
    const loadTestResults = async () => {
      // Double-check authentication with token
      const token = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
      if (!isAuthenticated && !token) {
        setLoading(false);
        setTestResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Build filters - Use examId as primary filter to show all results for the exam
        // This ensures users see all their test results, not just ones matching exact hierarchy
        const filters = {};
        
        // Always filter by examId if available (shows all results for that exam)
        // This is the most important filter - shows all test results for the current exam
        if (examId) {
          filters.examId = String(examId);
        }
        
        // Don't filter by deeper levels (unit, chapter, topic, subtopic) as it's too restrictive
        // Users want to see all their test results for the exam, regardless of which unit/chapter they took the test from

        console.log("PerformanceTab: Fetching test results with filters:", filters);
        console.log("PerformanceTab: Authentication status:", { isAuthenticated, hasToken: !!token });

        const results = await fetchAllStudentTestResults(filters);
        
        console.log("PerformanceTab: Received test results:", {
          count: results?.length || 0,
          results: results?.slice(0, 3), // Log first 3 for debugging
          allResults: results, // Log all for debugging
        });

        setTestResults(results || []);
      } catch (err) {
        console.error("PerformanceTab: Error loading test results:", err);
        setError("Failed to load performance data");
        setTestResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to ensure component is mounted and ready
    const timer = setTimeout(() => {
      loadTestResults();
    }, 150);

    return () => clearTimeout(timer);
  }, [
    isAuthenticated,
    examId,
    // Only depend on examId - show all results for the exam
  ]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!testResults || testResults.length === 0) {
      return {
        totalTests: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        unansweredQuestions: 0,
        averageTime: 0,
        improvement: 0,
      };
    }

    const scores = testResults.map((r) => r.percentage || 0);
    const totalQuestions = testResults.reduce(
      (sum, r) => sum + (r.totalQuestions || 0),
      0
    );
    const correctAnswers = testResults.reduce(
      (sum, r) => sum + (r.correctCount || 0),
      0
    );
    const incorrectAnswers = testResults.reduce(
      (sum, r) => sum + (r.incorrectCount || 0),
      0
    );
    const unansweredQuestions = testResults.reduce(
      (sum, r) => sum + (r.unansweredCount || 0),
      0
    );
    const totalTime = testResults.reduce(
      (sum, r) => sum + (r.timeTaken || 0),
      0
    );

    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);

    // Calculate improvement (compare first half vs second half)
    const sortedByDate = [...testResults].sort(
      (a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0)
    );
    const midPoint = Math.floor(sortedByDate.length / 2);
    const firstHalf = sortedByDate.slice(0, midPoint);
    const secondHalf = sortedByDate.slice(midPoint);

    let improvement = 0;
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfAvg =
        firstHalf.reduce((sum, r) => sum + (r.percentage || 0), 0) /
        firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, r) => sum + (r.percentage || 0), 0) /
        secondHalf.length;
      improvement = secondHalfAvg - firstHalfAvg;
    }

    return {
      totalTests: testResults.length,
      averageScore: Math.round(averageScore * 100) / 100,
      bestScore: Math.round(bestScore * 100) / 100,
      worstScore: Math.round(worstScore * 100) / 100,
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unansweredQuestions,
      averageTime: Math.round(totalTime / testResults.length),
      improvement: Math.round(improvement * 100) / 100,
    };
  }, [testResults]);

  // Format time (seconds to readable format)
  const formatTime = (seconds) => {
    if (!seconds) return "0s";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get score color based on percentage
  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  // Get score background color
  const getScoreBgColor = (percentage) => {
    if (percentage >= 80) return "bg-green-50 border-green-200";
    if (percentage >= 60) return "bg-blue-50 border-blue-200";
    if (percentage >= 40) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  // Prepare chart data (last 10 tests for visualization)
  const chartData = useMemo(() => {
    const sorted = [...testResults]
      .sort(
        (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
      )
      .slice(0, 10)
      .reverse();

    return sorted.map((result, index) => ({
      index: index + 1,
      percentage: result.percentage || 0,
      date: formatDate(result.submittedAt),
    }));
  }, [testResults]);

  // Calculate accuracy rate
  const accuracyRate =
    stats.totalQuestions > 0
      ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100 * 100) /
      100
      : 0;

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div >
        <div className="p-6 sm:p-8 ">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-15 h-15 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-md">
              <FaLock className="text-xl text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              Authentication Required
            </h3>
            <p className="text-sm sm:text-base text-gray-700 mb-2 max-w-2xl mx-auto leading-relaxed">
              To access your performance analytics and track your learning
              progress, you need to be logged in to your account.
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mb-6 max-w-xl mx-auto">
              Sign in to view detailed statistics, test results, progress
              trends, and personalized insights for {entityName}.
            </p>
          </div>

          {/* Features List */}
          <div className="bg-white/60 rounded-lg p-4 sm:p-5 mb-6 border border-blue-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FaChartLine className="text-blue-600" />
              What you&apos;ll get after logging in:
            </h4>
            <ul className="space-y-2 text-left">
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>View detailed performance analytics and statistics</span>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Track your test scores and improvement trends</span>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Monitor accuracy rates and time management</span>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Access your complete test history and results</span>
              </li>
              <li className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Identify strengths and areas for improvement</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Button
              href={authHref(pathname, "/login")}
              variant="primary"
              size="md"
              className="flex items-center justify-center gap-2"
            >
              <FaUser className="text-sm" />
              <span>Sign In</span>
            </Button>
            <Button
              href={authHref(pathname, "/register")}
              variant="outline"
              size="md"
              className="flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:border-blue-700 hover:text-blue-700"
            >
              <FaUserPlus className="text-sm" />
              <span>Create Account</span>
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-blue-200">
            <p className="text-xs text-gray-600 text-center">
              Don&apos;t have an account yet?{" "}
              <Link
                href={authHref(pathname, "/register")}
                className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 transition-colors"
              >
                Create a free account
              </Link>{" "}
              to start tracking your performance and unlock all features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-3"></div>
            <p className="text-sm text-gray-600">Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4 px-3 sm:px-4 py-3 sm:py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (testResults.length === 0) {
    return (
      <div className="space-y-4 px-3 sm:px-4 py-3 sm:py-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Performance Analytics
          </h3>
          <p className="text-sm text-gray-700 leading-normal mb-4">
            Track your performance in {entityName}. Monitor your learning
            progress and test scores.
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 text-center">
          <FaChartLine className="text-4xl text-blue-600 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Test Results Yet
          </h3>
          <p className="text-sm text-gray-600">
            Complete practice tests to see your performance analytics here. Your
            scores, progress trends, and improvement metrics will be displayed
            once you start taking tests.
          </p>
        </div>
      </div>
    );
  }

  // Chart max height for SVG
  const chartHeight = 200;
  const chartWidth = Math.max(400, chartData.length * 50);
  const maxPercentage = Math.max(100, ...chartData.map((d) => d.percentage));

  return (
    <div className="space-y-6 px-3 sm:px-4 py-3 sm:py-4">
      {/* Header */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          Performance Analytics
        </h3>
        <p className="text-sm text-gray-700 leading-normal">
          Track your performance in {entityName}. Monitor your progress and
          identify areas for improvement.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Score */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <FaChartLine className="text-white text-lg" />
            </div>
            <span
              className={`text-2xl font-bold ${getScoreColor(
                stats.averageScore
              )}`}
            >
              {stats.averageScore.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-700">Average Score</p>
          <p className="text-xs text-gray-600 mt-1">
            Across {stats.totalTests} test{stats.totalTests !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Best Score */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <FaTrophy className="text-white text-lg" />
            </div>
            <span className="text-2xl font-bold text-green-600">
              {stats.bestScore.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-700">Best Score</p>
          <p className="text-xs text-gray-600 mt-1">Personal best</p>
        </div>

        {/* Total Tests */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <FaAward className="text-white text-lg" />
            </div>
            <span className="text-2xl font-bold text-purple-600">
              {stats.totalTests}
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-700">Total Tests</p>
          <p className="text-xs text-gray-600 mt-1">Tests completed</p>
        </div>

        {/* Improvement */}
        <div
          className={`bg-gradient-to-br rounded-xl p-4 border shadow-sm ${stats.improvement > 0
              ? "from-emerald-50 to-emerald-100 border-emerald-200"
              : stats.improvement < 0
                ? "from-red-50 to-red-100 border-red-200"
                : "from-gray-50 to-gray-100 border-gray-200"
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.improvement > 0
                  ? "bg-emerald-500"
                  : stats.improvement < 0
                    ? "bg-red-500"
                    : "bg-gray-500"
                }`}
            >
              {stats.improvement > 0 ? (
                <FaArrowUp className="text-white text-lg" />
              ) : stats.improvement < 0 ? (
                <FaArrowDown className="text-white text-lg" />
              ) : (
                <FaMinus className="text-white text-lg" />
              )}
            </div>
            <span
              className={`text-2xl font-bold ${stats.improvement > 0
                  ? "text-emerald-600"
                  : stats.improvement < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
            >
              {stats.improvement > 0 ? "+" : ""}
              {stats.improvement.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-700">Improvement</p>
          <p className="text-xs text-gray-600 mt-1">Recent trend</p>
        </div>
      </div>

      {/* Detailed Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Accuracy */}
        <Card variant="standard" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FaCheckCircle className="text-green-600 text-xl" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Accuracy Rate</p>
              <p className="text-xl font-bold text-gray-900">
                {accuracyRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {stats.correctAnswers} / {stats.totalQuestions} correct
              </p>
            </div>
          </div>
        </Card>

        {/* Time Average */}
        <Card variant="standard" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaClock className="text-blue-600 text-xl" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Avg. Time per Test</p>
              <p className="text-xl font-bold text-gray-900">
                {formatTime(stats.averageTime)}
              </p>
              <p className="text-xs text-gray-500">Time management</p>
            </div>
          </div>
        </Card>

        {/* Answer Breakdown */}
        <Card variant="standard" className="p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">
              Answer Breakdown
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600 flex items-center gap-1">
                  <FaCheckCircle /> Correct
                </span>
                <span className="font-semibold">{stats.correctAnswers}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-600 flex items-center gap-1">
                  <FaTimesCircle /> Incorrect
                </span>
                <span className="font-semibold">{stats.incorrectAnswers}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1">
                  <FaQuestionCircle /> Unanswered
                </span>
                <span className="font-semibold">
                  {stats.unansweredQuestions}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Chart */}
      {chartData.length > 0 && (
        <Card variant="standard" className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-bold text-gray-900">
              Performance Trend
            </h4>
            <span className="text-xs text-gray-500">
              Last {chartData.length} test{chartData.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <svg
              width={chartWidth}
              height={chartHeight}
              className="w-full"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((value) => {
                const y =
                  chartHeight -
                  (value / maxPercentage) * (chartHeight - 40) -
                  20;
                return (
                  <g key={value}>
                    <line
                      x1="40"
                      y1={y}
                      x2={chartWidth - 20}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="35"
                      y={y + 4}
                      textAnchor="end"
                      className="text-xs fill-gray-500"
                    >
                      {value}%
                    </text>
                  </g>
                );
              })}

              {/* Chart line */}
              <polyline
                points={chartData
                  .map(
                    (d, i) =>
                      `${40 +
                      (i * (chartWidth - 60)) / (chartData.length - 1 || 1)
                      },${chartHeight -
                      (d.percentage / maxPercentage) * (chartHeight - 40) -
                      20
                      }`
                  )
                  .join(" ")}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {chartData.map((d, i) => {
                const x =
                  40 + (i * (chartWidth - 60)) / (chartData.length - 1 || 1);
                const y =
                  chartHeight -
                  (d.percentage / maxPercentage) * (chartHeight - 40) -
                  20;
                return (
                  <g key={i}>
                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill="#10b981"
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      className="text-xs fill-gray-700 font-semibold"
                    >
                      {d.percentage.toFixed(0)}%
                    </text>
                  </g>
                );
              })}

              {/* X-axis labels */}
              {chartData.map((d, i) => {
                const x =
                  40 + (i * (chartWidth - 60)) / (chartData.length - 1 || 1);
                return (
                  <text
                    key={i}
                    x={x}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    className="text-xs fill-gray-500"
                  >
                    {d.index}
                  </text>
                );
              })}
            </svg>
          </div>
        </Card>
      )}

      {/* Recent Test Attempts */}
      <Card variant="standard" className="overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h4 className="text-base font-bold text-gray-900">
            Recent Test Attempts
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            Your latest test performances
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Paper Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Marks
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Accuracy
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Trend
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {testResults.slice(0, 10).map((result, index) => {
                const prevResult = testResults[index + 1];
                const trend =
                  prevResult && result.percentage
                    ? result.percentage - prevResult.percentage
                    : 0;
                const resultAccuracy =
                  result.totalQuestions > 0
                    ? Math.round(
                      ((result.correctCount || 0) / result.totalQuestions) *
                      100 *
                      100
                    ) / 100
                    : 0;

                // Get test name from populated testId
                // When populated, testId is an object: {_id: "...", name: "Test Name"}
                // If not populated, testId is just the ObjectId string
                const testName =
                  result.testId &&
                    typeof result.testId === "object" &&
                    result.testId.name
                    ? result.testId.name
                    : "Test";

                return (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="max-w-[200px]">
                        <span className="text-xs font-semibold text-gray-900 line-clamp-2">
                          {testName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400 text-xs" />
                        <span className="text-xs text-gray-700">
                          {formatDate(result.submittedAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-bold ${getScoreColor(
                          result.percentage || 0
                        )}`}
                      >
                        {(result.percentage || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700">
                        {result.totalMarks?.toFixed(1) || 0} /{" "}
                        {result.maximumMarks?.toFixed(1) || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${resultAccuracy >= 80
                                ? "bg-green-500"
                                : resultAccuracy >= 60
                                  ? "bg-blue-500"
                                  : resultAccuracy >= 40
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                            style={{ width: `${resultAccuracy}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {resultAccuracy.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-700">
                        {formatTime(result.timeTaken)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {trend > 0 ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <FaArrowUp className="text-xs" />
                          <span className="text-xs font-semibold">
                            +{trend.toFixed(1)}%
                          </span>
                        </div>
                      ) : trend < 0 ? (
                        <div className="flex items-center gap-1 text-red-600">
                          <FaArrowDown className="text-xs" />
                          <span className="text-xs font-semibold">
                            {trend.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <FaMinus className="text-xs" />
                          <span className="text-xs">—</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewResult(result)}
                        className="flex items-center gap-1"
                      >
                        <FaEye className="text-xs" />
                        View Result
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Strengths & Weaknesses */}
      {testResults.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaFire className="text-green-600 text-xl" />
              <h4 className="text-base font-bold text-gray-900">Strengths</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  Consistent Performance
                </span>
                <span className="text-sm font-semibold text-green-600">
                  {stats.improvement > 0 ? "Improving" : "Stable"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Best Score</span>
                <span className="text-sm font-semibold text-green-600">
                  {stats.bestScore.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Test Completion</span>
                <span className="text-sm font-semibold text-green-600">
                  {stats.totalTests} tests
                </span>
              </div>
            </div>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 sm:p-6 border border-orange-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaArrowUp className="text-orange-600 text-xl" />
              <h4 className="text-base font-bold text-gray-900">
                Areas for Improvement
              </h4>
            </div>
            <div className="space-y-2">
              {stats.averageScore < 60 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Overall Score</span>
                  <span className="text-sm font-semibold text-orange-600">
                    Below 60%
                  </span>
                </div>
              )}
              {accuracyRate < 70 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Accuracy Rate</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {accuracyRate.toFixed(1)}%
                  </span>
                </div>
              )}
              {stats.unansweredQuestions > stats.totalQuestions * 0.1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Unanswered Questions
                  </span>
                  <span className="text-sm font-semibold text-orange-600">
                    {Math.round(
                      (stats.unansweredQuestions / stats.totalQuestions) * 100
                    )}
                    %
                  </span>
                </div>
              )}
              {stats.averageScore >= 60 && accuracyRate >= 70 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Keep practicing!
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    Great progress
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceTab;

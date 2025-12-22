"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import {
  FaArrowLeft,
  FaFilePdf,
  FaInfoCircle,
  FaRedo,
  FaGraduationCap,
  FaChartLine,
  FaCheckDouble,
} from "react-icons/fa";

export default function APAfricanAmericanStudiesCalculator() {
  const [sections, setSections] = useState({
    mcq: { score: 30, max: 60 },
    validation: { score: 1, max: 1 },
    visualSource: { score: 2, max: 3 },
    textSource: { score: 2, max: 4 },
    resource: { score: 2, max: 3 },
    dbq: { score: 4, max: 7 },
    isp: { score: 6, max: 12 },
  });

  const [results, setResults] = useState({
    mcqScore: 0,
    frqScore: 0,
    ispScore: 0,
    totalComposite: 0,
    apScore: 1,
  });

  // Chart state
  const [inputType, setInputType] = useState("correctAnswers"); // "correctAnswers" or "percentile"
  const [chartCorrectAnswers, setChartCorrectAnswers] = useState(30);
  const [desiredPercentile, setDesiredPercentile] = useState(50);
  const [chartLoaded, setChartLoaded] = useState(false);

  // Initialize chart animation
  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      setChartLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Generate score distribution data (bell curve-like distribution)
  const generateDistribution = () => {
    const maxScore = 60;
    const distribution = [];
    const mean = 32; // Average score
    const stdDev = 10; // Standard deviation

    for (let score = 0; score <= maxScore; score++) {
      // Normal distribution formula (simplified)
      const probability =
        Math.exp(-0.5 * Math.pow((score - mean) / stdDev, 2)) /
        (stdDev * Math.sqrt(2 * Math.PI));
      const count = Math.round(probability * 200); // Scale to get reasonable counts
      distribution.push({ score, count: Math.max(0, count) });
    }

    return distribution;
  };

  const distributionData = generateDistribution();
  const maxCount = Math.max(...distributionData.map((d) => d.count));

  // Calculate percentile from correct answers
  const calculatePercentile = (correctAnswers) => {
    let totalStudents = 0;
    let studentsBelow = 0;

    distributionData.forEach((item) => {
      totalStudents += item.count;
      if (item.score < correctAnswers) {
        studentsBelow += item.count;
      }
    });

    if (totalStudents === 0) return 0;
    return ((studentsBelow / totalStudents) * 100).toFixed(1);
  };

  // Calculate correct answers from percentile
  const calculateCorrectAnswersFromPercentile = (percentile) => {
    let totalStudents = 0;
    distributionData.forEach((item) => {
      totalStudents += item.count;
    });

    const targetStudents = (percentile / 100) * totalStudents;
    let cumulative = 0;

    for (let i = 0; i <= 60; i++) {
      const item = distributionData[i];
      cumulative += item.count;
      if (cumulative >= targetStudents) {
        return i;
      }
    }
    return 60;
  };

  const currentPercentile = calculatePercentile(chartCorrectAnswers);

  useEffect(() => {
    const calculateScore = () => {
      const mcqScore = sections.mcq.score;
      const frqScore =
        sections.visualSource.score +
        sections.textSource.score +
        sections.resource.score +
        sections.dbq.score;
      const ispScore = sections.validation.score + sections.isp.score;
      const totalComposite = mcqScore + frqScore + ispScore;

      let apScore = 1;
      if (totalComposite >= 80) apScore = 5;
      else if (totalComposite >= 65) apScore = 4;
      else if (totalComposite >= 50) apScore = 3;
      else if (totalComposite >= 35) apScore = 2;
      else apScore = 1;

      setResults({ mcqScore, frqScore, ispScore, totalComposite, apScore });
    };
    calculateScore();
  }, [sections]);

  const handleSliderChange = (sectionKey, value) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        score: Math.min(
          Math.max(0, parseInt(value) || 0),
          prev[sectionKey].max
        ),
      },
    }));
  };

  const getTheme = (score) => {
    const themes = {
      5: "from-emerald-400 to-teal-600 shadow-emerald-500/30",
      4: "from-blue-500 to-indigo-600 shadow-blue-500/30",
      3: "from-amber-400 to-orange-500 shadow-amber-500/30",
      2: "from-orange-500 to-rose-500 shadow-orange-500/30",
      1: "from-slate-500 to-slate-700 shadow-slate-500/30",
    };
    return themes[score] || themes[1];
  };

  const getScoreLabel = (score) => {
    if (score >= 3) return "Qualified for Credit";
    return "Developing Knowledge";
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* Navigation - Perfect Typography */}
      <nav className="h-14 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-full px-5 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/calculator"
              className="text-slate-500 hover:text-slate-900 transition-colors p-1.5 -ml-1.5 hover:bg-slate-100 rounded"
              aria-label="Back to calculators"
            >
              <FaArrowLeft size={13} />
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <FaGraduationCap className="text-blue-600" size={16} />
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-none">
                  AP African American Studies
                </h1>
                <p className="text-xs text-slate-500 font-medium leading-none mt-0.5">
                  Score Engine
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider leading-none">
                2025 Projected Curve
              </span>
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Score Distribution Chart Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 leading-tight">
              AP® African American Studies -- Practice Exam 1 -- Multiple Choice
              Questions
            </h2>

            {/* Chart Container */}
            <div className="mb-6">
              {/* Legend */}
              <div className="flex justify-end mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 rounded shadow-sm">
                  <span className="text-xs text-white font-medium">Count</span>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="relative w-full bg-white rounded-lg border border-slate-200 p-4">
                <svg
                  width="100%"
                  height="280"
                  viewBox="0 0 750 280"
                  className="overflow-visible"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <line
                      key={`grid-${i}`}
                      x1="50"
                      y1={30 + i * 40}
                      x2="720"
                      y2={30 + i * 40}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Y-axis labels */}
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <text
                      key={`y-label-${i}`}
                      x="45"
                      y={35 + i * 40}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="11"
                      fontFamily="sans-serif"
                      className="transition-opacity duration-300"
                    >
                      {i * 10}
                    </text>
                  ))}

                  {/* Bars */}
                  {distributionData.map((item, index) => {
                    const barHeight = Math.max(
                      2,
                      (item.count / maxCount) * 200
                    );
                    const barWidth = 10;
                    const barX = 60 + index * 11;
                    const barY = 270 - barHeight;
                    const isHighlighted =
                      inputType === "correctAnswers" &&
                      item.score === chartCorrectAnswers;
                    const animationDelay = Math.min(index * 3, 200);

                    return (
                      <g key={`bar-${index}`}>
                        <rect
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={barHeight}
                          fill={
                            isHighlighted
                              ? "#14b8a6"
                              : item.score === 0 && item.count > 0
                              ? "#14b8a6"
                              : "#3b82f6"
                          }
                          rx="1.5"
                          className="transition-all duration-300 ease-out"
                          style={{
                            opacity: chartLoaded
                              ? isHighlighted
                                ? 1
                                : 0.85
                              : 0,
                            transform: chartLoaded ? "scaleY(1)" : "scaleY(0)",
                            transformOrigin: "bottom",
                            transitionDelay: `${animationDelay}ms`,
                            transitionProperty: "opacity, transform",
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* X-axis labels */}
                  {[0, 10, 20, 30, 40, 50, 60].map((score) => {
                    const xPos = 60 + (score / 60) * 660;
                    return (
                      <text
                        key={`x-label-${score}`}
                        x={xPos}
                        y="275"
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="10"
                        fontFamily="sans-serif"
                        transform={`rotate(-45 ${xPos} 275)`}
                        className="transition-opacity duration-300"
                      >
                        {score}
                      </text>
                    );
                  })}

                  {/* Y-axis label */}
                  <text
                    x="15"
                    y="155"
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="11"
                    fontFamily="sans-serif"
                    fontWeight="500"
                    transform="rotate(-90 15 155)"
                    className="transition-opacity duration-300"
                  >
                    Count
                  </text>
                </svg>
              </div>
            </div>

            {/* Input Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Select Input Type
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setInputType("correctAnswers");
                    setChartCorrectAnswers(
                      calculateCorrectAnswersFromPercentile(desiredPercentile)
                    );
                  }}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    inputType === "correctAnswers"
                      ? "bg-teal-500 text-white shadow-sm hover:bg-teal-600"
                      : "bg-white text-teal-500 border-2 border-teal-500 hover:bg-teal-50"
                  }`}
                >
                  Correct Answers
                </button>
                <button
                  onClick={() => {
                    setInputType("percentile");
                    setDesiredPercentile(parseFloat(currentPercentile));
                  }}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    inputType === "percentile"
                      ? "bg-teal-500 text-white shadow-sm hover:bg-teal-600"
                      : "bg-white text-teal-500 border-2 border-teal-500 hover:bg-teal-50"
                  }`}
                >
                  Desired Percentile
                </button>
              </div>
            </div>

            {/* Correct Answers Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Correct Answers
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={chartCorrectAnswers}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setChartCorrectAnswers(value);
                      if (inputType === "correctAnswers") {
                        setDesiredPercentile(
                          parseFloat(calculatePercentile(value))
                        );
                      }
                    }}
                    className="chart-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                        (chartCorrectAnswers / 60) * 100
                      }%, #e2e8f0 ${
                        (chartCorrectAnswers / 60) * 100
                      }%, #e2e8f0 100%)`,
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-slate-900">
                    {chartCorrectAnswers}
                  </span>
                  <span className="text-sm text-slate-500 font-medium">
                    /60
                  </span>
                </div>
              </div>
            </div>

            {/* Percentile Display */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Percentile
              </label>
              <div className="bg-slate-100 rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="text-4xl font-bold text-slate-900 transition-all duration-300">
                  {inputType === "percentile"
                    ? desiredPercentile.toFixed(1)
                    : currentPercentile}
                  %
                </div>
                {inputType === "percentile" && (
                  <div className="mt-5">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={desiredPercentile}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setDesiredPercentile(value);
                        setChartCorrectAnswers(
                          calculateCorrectAnswersFromPercentile(value)
                        );
                      }}
                      className="chart-slider w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${desiredPercentile}%, #e2e8f0 ${desiredPercentile}%, #e2e8f0 100%)`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Column - Input Sections */}
          <div className="lg:col-span-8 space-y-6 flex flex-col">
            {/* Section I & II in One Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Section I: Multiple Choice */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-blue-600 leading-none mb-1">
                      Section I
                    </h3>
                    <p className="text-base font-bold text-slate-900 leading-tight">
                      Multiple Choice
                    </p>
                  </div>
                  <div className="text-right font-mono font-bold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    <span className="text-2xl text-blue-600 leading-none">
                      {sections.mcq.score}
                    </span>
                    <span className="text-sm text-slate-400 ml-1 font-normal">
                      /60
                    </span>
                  </div>
                </div>
                <div className="relative mt-auto">
                  <input
                    type="range"
                    min="0"
                    max={sections.mcq.max}
                    value={sections.mcq.score}
                    onChange={(e) => handleSliderChange("mcq", e.target.value)}
                    className="modern-slider w-full accent-blue-600"
                    style={{
                      background: `linear-gradient(to right, #60A5FA 0%, #60A5FA ${
                        (sections.mcq.score / sections.mcq.max) * 100
                      }%, #E2E8F0 ${
                        (sections.mcq.score / sections.mcq.max) * 100
                      }%, #E2E8F0 100%)`,
                    }}
                  />
                </div>
              </div>

              {/* Section II: Individual Project */}
              <div className="bg-slate-900 rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col h-full">
                <div className="relative z-10 text-white flex flex-col h-full">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-blue-400 leading-none mb-1">
                        Section II
                      </h3>
                      <p className="text-base font-bold leading-tight mb-0.5">
                        Individual Project
                      </p>
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider leading-none">
                        Project Content
                      </p>
                    </div>
                    <div className="text-right font-mono font-bold bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20">
                      <span className="text-2xl text-blue-400 leading-none">
                        {sections.isp.score}
                      </span>
                      <span className="text-sm text-slate-400 ml-1 font-normal">
                        /12
                      </span>
                    </div>
                  </div>
                  <div className="relative mt-auto">
                    <input
                      type="range"
                      min="0"
                      max={12}
                      value={sections.isp.score}
                      onChange={(e) =>
                        handleSliderChange("isp", e.target.value)
                      }
                      className="modern-slider-dark w-full"
                      style={{
                        background: `linear-gradient(to right, #60A5FA 0%, #60A5FA ${
                          (sections.isp.score / 12) * 100
                        }%, rgba(255,255,255,0.1) ${
                          (sections.isp.score / 12) * 100
                        }%, rgba(255,255,255,0.1) 100%)`,
                      }}
                    />
                  </div>
                </div>
                <FaCheckDouble
                  className="absolute -right-8 -bottom-8 text-white/5"
                  size={120}
                />
              </div>
            </div>

            {/* Section III-VI: Free Response Suite */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none">
                  Section III-VI: Free Response Suite
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    key: "visualSource",
                    label: "Visual Source Analysis",
                    max: 3,
                  },
                  {
                    key: "textSource",
                    label: "Text Source Analysis",
                    max: 4,
                  },
                  {
                    key: "resource",
                    label: "Source Comparison",
                    max: 3,
                  },
                  {
                    key: "dbq",
                    label: "Document Based Question",
                    max: 7,
                  },
                  {
                    key: "validation",
                    label: "Exam Day Validation",
                    max: 1,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="space-y-2.5 p-3.5 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-700 leading-tight">
                        {item.label}
                      </label>
                      <span className="text-xs font-mono font-bold bg-white border border-slate-200 px-2 py-0.5 rounded leading-none">
                        {sections[item.key].score}/{item.max}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max={item.max}
                        value={sections[item.key].score}
                        onChange={(e) =>
                          handleSliderChange(item.key, e.target.value)
                        }
                        className="modern-slider w-full accent-blue-600"
                        style={{
                          background: `linear-gradient(to right, #60A5FA 0%, #60A5FA ${
                            (sections[item.key].score / item.max) * 100
                          }%, #E2E8F0 ${
                            (sections[item.key].score / item.max) * 100
                          }%, #E2E8F0 100%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center gap-2.5 mb-4">
                <FaInfoCircle className="text-blue-600" size={14} />
                <h3 className="text-sm font-bold text-slate-900">
                  About This Calculator
                </h3>
              </div>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed flex-1">
                <p>
                  This calculator uses a projected scoring curve based on the
                  College Board&apos;s guidelines and historical AP exam data.
                  Since AP® African American Studies is a new course, the
                  College Board hasn&apos;t released an official scoring
                  worksheet yet.
                </p>
                <p>
                  Our projected curve is based on similar AP Social Studies
                  courses and will be updated when official data becomes
                  available. Use this calculator to estimate your score and
                  identify areas for improvement.
                </p>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Quick Tips
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>
                        Focus on improving your weakest section to maximize your
                        composite score
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>
                        The Individual Student Project is worth 13 points total
                        (12 for content + 1 for validation)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>
                        Aim for a composite score of 50+ to earn a passing grade
                        (3 or higher)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results Panel */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-2xl flex flex-col h-full lg:sticky lg:top-20">
              <div className="bg-slate-950 rounded-xl p-6 text-white relative overflow-hidden flex-1 flex flex-col">
                {/* Background Glow */}
                <div
                  className={`absolute -top-20 -left-20 w-48 h-48 blur-[80px] opacity-20 bg-gradient-to-br ${getTheme(
                    results.apScore
                  )}`}
                />
                <div
                  className={`absolute -bottom-10 -right-10 w-32 h-32 blur-[60px] opacity-10 bg-gradient-to-br ${getTheme(
                    results.apScore
                  )}`}
                />

                <div className="relative z-10 flex flex-col items-center flex-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-6 leading-none">
                    Score Projection
                  </span>

                  <div
                    className={`w-32 h-32 rounded-full flex flex-col items-center justify-center bg-gradient-to-br ${getTheme(
                      results.apScore
                    )} shadow-2xl transition-all duration-500`}
                  >
                    <span className="text-6xl font-black tracking-tighter leading-none text-white">
                      {results.apScore}
                    </span>
                    <span className="text-[9px] font-black uppercase mt-1 tracking-widest opacity-90 leading-none text-white">
                      Final
                    </span>
                  </div>

                  <h4 className="mt-6 text-lg font-bold tracking-tight leading-tight text-white">
                    {getScoreLabel(results.apScore)}
                  </h4>
                  <p className="text-slate-400 text-[10px] mt-1.5 italic leading-tight">
                    Based on pilot weighting data
                  </p>

                  <div className="w-full mt-7 space-y-2.5">
                    <div className="flex justify-between items-center p-3.5 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                        Composite Score
                      </span>
                      <span className="text-lg font-bold text-white leading-none">
                        {results.totalComposite}
                        <span className="text-slate-500 ml-1.5 text-sm font-normal">
                          /100
                        </span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 leading-none tracking-wider">
                          MCQ
                        </span>
                        <span className="text-base font-bold text-blue-400 leading-none">
                          {results.mcqScore}
                        </span>
                      </div>
                      <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5 leading-none tracking-wider">
                          FRQ
                        </span>
                        <span className="text-base font-bold text-emerald-400 leading-none">
                          {results.frqScore}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button className="w-full mt-7 py-3 bg-white text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-lg leading-none">
                    <FaFilePdf size={12} /> Download PDF Report
                  </button>
                </div>
              </div>

              {/* Quick Info */}
              <div className="p-5 bg-slate-50 shrink-0">
                <div className="flex justify-between items-center mb-3.5">
                  <div className="flex items-center gap-2">
                    <FaInfoCircle className="text-slate-400" size={11} />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none">
                      Scale Info
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSections({
                        mcq: { score: 0, max: 60 },
                        validation: { score: 0, max: 1 },
                        visualSource: { score: 0, max: 3 },
                        textSource: { score: 0, max: 4 },
                        resource: { score: 0, max: 3 },
                        dbq: { score: 0, max: 7 },
                        isp: { score: 0, max: 12 },
                      });
                    }}
                    className="text-blue-600 hover:text-blue-700 hover:rotate-180 transition-all duration-300 p-1.5 -mr-1.5 hover:bg-blue-50 rounded"
                    aria-label="Reset all scores"
                  >
                    <FaRedo size={11} />
                  </button>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3].map((s) => (
                    <div
                      key={s}
                      className={`flex justify-between items-center text-[10px] p-2.5 rounded-lg border transition-all ${
                        results.apScore === s
                          ? "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                          : "bg-white border-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="font-medium leading-tight">
                        Score {s} Range
                      </span>
                      <span className="font-mono font-semibold leading-none">
                        {s === 5 ? "80-100" : s === 4 ? "65-79" : "50-64"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Additional Information Sections */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10 bg-slate-50">
        <div className="space-y-6">
          {/* What Is a Good AP® African American Studies Score? */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5 leading-tight">
              What Is a Good AP® African American Studies Score?
            </h2>
            <div className="space-y-5 text-slate-700">
              <p className="text-sm leading-relaxed">
                Scores of{" "}
                <strong className="text-slate-900 font-semibold">
                  3, 4, or 5
                </strong>{" "}
                are considered good scores on the AP® African American Studies
                exam. These scores indicate:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-200 transition-colors">
                  <div className="text-4xl font-black text-amber-600 mb-2 leading-none">
                    3
                  </div>
                  <div className="text-sm font-bold text-amber-900 mb-2">
                    Qualified
                  </div>
                  <div className="text-xs text-amber-700 leading-relaxed">
                    Demonstrates competency in the subject matter
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-blue-50 border border-blue-100 hover:border-blue-200 transition-colors">
                  <div className="text-4xl font-black text-blue-600 mb-2 leading-none">
                    4
                  </div>
                  <div className="text-sm font-bold text-blue-900 mb-2">
                    Well Qualified
                  </div>
                  <div className="text-xs text-blue-700 leading-relaxed">
                    Shows strong understanding and analytical skills
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-100 hover:border-emerald-200 transition-colors">
                  <div className="text-4xl font-black text-emerald-600 mb-2 leading-none">
                    5
                  </div>
                  <div className="text-sm font-bold text-emerald-900 mb-2">
                    Extremely Well Qualified
                  </div>
                  <div className="text-xs text-emerald-700 leading-relaxed">
                    Represents exceptional mastery of the content
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2">
                Colleges may offer credit or placement for scores of 3 or
                higher. Since AP® African American Studies is a new course,
                historical data is limited. However, the 2024 pilot exam results
                provide valuable insight:
              </p>
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-bold mt-0.5 shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-slate-900">72.6%</strong> of
                      students scored a 3 or higher
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-bold mt-0.5 shrink-0">
                      •
                    </span>
                    <span>
                      The mean score was{" "}
                      <strong className="text-slate-900">3.22</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-bold mt-0.5 shrink-0">
                      •
                    </span>
                    <span>
                      <strong className="text-slate-900">14.2%</strong> of
                      students earned a 5, while{" "}
                      <strong className="text-slate-900">30.2%</strong> earned a
                      4
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* What Is the Average AP® African American Studies Score? */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5 leading-tight">
              What Is the Average AP® African American Studies Score?
            </h2>
            <div className="space-y-5 text-slate-700">
              <p className="text-sm leading-relaxed">
                The average AP® African American Studies score will change
                yearly based on test difficulty and the student population.
                However, the College Board aims to maintain consistent score
                distributions across different exam administrations to ensure
                fairness and comparability.
              </p>
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <p className="text-xs text-blue-900 mb-2">
                  <strong className="font-bold text-sm">
                    2024 Pilot Exam Mean Score:
                  </strong>
                </p>
                <p className="text-3xl font-black text-blue-600 leading-none mb-2">
                  3.22
                </p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  This represents the average score from the pilot exam
                  administration, providing a baseline for future comparisons.
                </p>
              </div>
            </div>
          </div>

          {/* Why Are AP® African American Studies Scores Curved? */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5 leading-tight">
              Why Are AP® African American Studies Scores Curved?
            </h2>
            <div className="space-y-5 text-slate-700">
              <p className="text-sm leading-relaxed">
                The College Board curves AP® exams to maintain consistent
                standards and ensure fairness across different test versions and
                student groups. Since AP® courses are college-level, the scoring
                process accounts for variations in:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-xs">1</span>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-slate-900 text-sm">
                      Test Difficulty:
                    </strong>{" "}
                    <span className="text-xs">
                      Different exam versions may vary slightly in difficulty
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-xs">2</span>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-slate-900 text-sm">
                      Student Population:
                    </strong>{" "}
                    <span className="text-xs">
                      The performance level of students taking the exam each
                      year
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-xs">3</span>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-slate-900 text-sm">
                      Consistency:
                    </strong>{" "}
                    <span className="text-xs">
                      Ensuring that a score of 3, 4, or 5 represents the same
                      level of achievement regardless of when the exam is taken
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* How Do I Get a 5 on AP® African American Studies? */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5 leading-tight">
              How Do I Get a 5 on AP® African American Studies?
            </h2>
            <div className="space-y-5 text-slate-700">
              <p className="text-sm leading-relaxed">
                Achieving a 5 on the AP® African American Studies exam requires
                strong study habits, applied learning, and deliberate practice.
                Success comes from developing key skills and understanding the
                content deeply.
              </p>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
                  Key Skills for Success:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <FaChartLine
                        className="text-blue-600 shrink-0"
                        size={14}
                      />
                      <span className="font-bold text-slate-900 text-xs">
                        Analyze Sources
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Analyze primary and secondary sources critically,
                      identifying bias, perspective, and historical context
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <FaChartLine
                        className="text-blue-600 shrink-0"
                        size={14}
                      />
                      <span className="font-bold text-slate-900 text-xs">
                        Make Connections
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Connect themes, events, and movements across different
                      historical periods and contexts
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <FaChartLine
                        className="text-blue-600 shrink-0"
                        size={14}
                      />
                      <span className="font-bold text-slate-900 text-xs">
                        Craft Arguments
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Develop strong, evidence-based arguments supported by
                      historical evidence and analysis
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <FaChartLine
                        className="text-blue-600 shrink-0"
                        size={14}
                      />
                      <span className="font-bold text-slate-900 text-xs">
                        Understand Impact
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Understand the impact of African American history in
                      broader American and global contexts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Looking for Practice Questions? */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 border border-blue-500 shadow-lg text-white hover:shadow-xl transition-shadow duration-200">
            <h2 className="text-xl sm:text-2xl font-bold mb-5 leading-tight">
              Looking for Practice Questions?
            </h2>
            <div className="space-y-5 text-blue-50">
              <p className="text-sm leading-relaxed">
                Master AP® African American Studies with comprehensive practice
                materials. Our platform offers hundreds of AP-aligned practice
                questions, including:
              </p>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <span className="text-white font-bold mt-0.5 shrink-0">
                    ✓
                  </span>
                  <span className="text-xs leading-relaxed">
                    Multiple-choice questions aligned with College Board
                    standards
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-white font-bold mt-0.5 shrink-0">
                    ✓
                  </span>
                  <span className="text-xs leading-relaxed">
                    Free-response questions with detailed scoring rubrics
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-white font-bold mt-0.5 shrink-0">
                    ✓
                  </span>
                  <span className="text-xs leading-relaxed">
                    Full-length practice exams to simulate test conditions
                  </span>
                </li>
              </ul>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-xs font-semibold leading-relaxed">
                  Students using our practice materials have seen{" "}
                  <strong className="text-white font-bold">
                    higher pass rates than the national average
                  </strong>{" "}
                  in past AP® exams.
                </p>
              </div>
            </div>
          </div>

          {/* Why Should I Use This AP® African American Studies Score Calculator? */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-5 leading-tight">
              Why Should I Use This AP® African American Studies Score
              Calculator?
            </h2>
            <div className="space-y-5 text-slate-700">
              <p className="text-sm leading-relaxed">
                Our AP® African American Studies Score Calculator is designed to
                help you understand your performance and plan your exam
                preparation effectively.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <FaInfoCircle className="text-blue-600" size={14} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Based on Official Guidelines
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Our calculator uses projected scoring curves based on
                    College Board guidelines and similar AP Social Studies
                    courses.
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <FaChartLine className="text-blue-600" size={14} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Understand Score Requirements
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    See exactly how many points you need to achieve scores of 3,
                    4, or 5, helping you set realistic goals.
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <FaGraduationCap className="text-blue-600" size={14} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Reduce Exam Stress
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Knowing your projected score helps reduce anxiety and allows
                    you to focus on areas that need improvement.
                  </p>
                </div>
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <FaCheckDouble className="text-blue-600" size={14} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs">
                      Plan Your Preparation
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Identify which sections need the most work and allocate your
                    study time more effectively.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .modern-slider {
          -webkit-appearance: none;
          height: 3px;
          background: #e2e8f0;
          border-radius: 3px;
          outline: none;
          transition: background 0.2s ease;
        }

        .modern-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #60a5fa;
          box-shadow: 0 2px 6px rgba(96, 165, 250, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modern-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(96, 165, 250, 0.5);
          border-color: #93c5fd;
        }

        .modern-slider::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }

        .modern-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #60a5fa;
          box-shadow: 0 2px 6px rgba(96, 165, 250, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modern-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(96, 165, 250, 0.5);
          border-color: #93c5fd;
        }

        .modern-slider::-moz-range-thumb:active {
          transform: scale(1.1);
        }

        .modern-slider-dark {
          -webkit-appearance: none;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          outline: none;
          transition: background 0.2s ease;
        }

        .modern-slider-dark::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #60a5fa;
          box-shadow: 0 2px 6px rgba(96, 165, 250, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modern-slider-dark::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(96, 165, 250, 0.5);
          border-color: #93c5fd;
        }

        .modern-slider-dark::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }

        .modern-slider-dark::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #60a5fa;
          box-shadow: 0 2px 6px rgba(96, 165, 250, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modern-slider-dark::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(96, 165, 250, 0.5);
          border-color: #93c5fd;
        }

        .modern-slider-dark::-moz-range-thumb:active {
          transform: scale(1.1);
        }

        .modern-slider:focus,
        .modern-slider-dark:focus {
          outline: none;
        }

        .modern-slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
        }

        .modern-slider-dark:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
        }

        .chart-slider {
          -webkit-appearance: none;
          height: 6px;
          border-radius: 3px;
          outline: none;
        }

        .chart-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chart-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 8px rgba(59, 130, 246, 0.3);
        }

        .chart-slider::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chart-slider::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 8px rgba(59, 130, 246, 0.3);
        }

        @keyframes barGrow {
          from {
            height: 0;
            transform: translateY(0);
          }
          to {
            transform: translateY(var(--bar-height));
          }
        }

        .bar-animation {
          animation: barGrow 0.6s ease-out forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

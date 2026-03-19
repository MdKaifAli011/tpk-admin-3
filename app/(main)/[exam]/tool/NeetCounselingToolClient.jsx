"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./NeetCounselingTool.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/self-study";

function buildQuery(params) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  });
  return u.toString();
}

function rankFmt(n) {
  if (n == null) return "—";
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`.replace(".00", "");
  return n.toLocaleString("en-IN");
}

function statusTagClass(status) {
  if (status === "Reported") return "tag tag-success";
  if (status === "Not Reported") return "tag tag-warning";
  if (status) return "tag tag-soft";
  return "tag tag-soft";
}

export default function NeetCounselingToolClient({ examSlug }) {
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [round, setRound] = useState("all");
  const [viewTab, setViewTab] = useState("overview");
  const [year, setYear] = useState("2025");
  const apiRound = round === "all" ? "1" : round;
  const [rankMin, setRankMin] = useState("");
  const [rankMax, setRankMax] = useState("");
  const [quota, setQuota] = useState("all");
  const [course, setCourse] = useState("all");
  const [state, setState] = useState("all");
  const [category, setCategory] = useState("all");
  const [instituteType, setInstituteType] = useState("all");
  const [q, setQ] = useState("");
  const [quickQ, setQuickQ] = useState("");
  const [sort, setSort] = useState("best_match");
  const sortApi = sort === "rank_asc" ? "rank_asc" : sort === "rank_desc" ? "rank_desc" : "serial_asc";
  const [page, setPage] = useState(1);
  const [filterNonce, setFilterNonce] = useState(0);

  // Form state: only these are shown in the filter panel; applied only on "Apply Filters"
  const [yearForm, setYearForm] = useState("2025");
  const [roundForm, setRoundForm] = useState("all");
  const [rankMinForm, setRankMinForm] = useState("");
  const [rankMaxForm, setRankMaxForm] = useState("");
  const [quotaForm, setQuotaForm] = useState("all");
  const [courseForm, setCourseForm] = useState("all");
  const [stateForm, setStateForm] = useState("all");
  const [categoryForm, setCategoryForm] = useState("all");
  const [instituteTypeForm, setInstituteTypeForm] = useState("all");

  const filtersRef = useRef(null);
  const resultsRef = useRef(null);

  const fetchMeta = useCallback(async () => {
    try {
      const r = round === "all" ? "1" : round;
      const res = await fetch(
        `${basePath}/api/neet-counseling/meta?round=${r}&year=${encodeURIComponent(year)}`
      );
      const json = await res.json();
      if (json.success) {
        setMeta(json.data);
        if (json.data.years?.length && !json.data.years.includes(year)) {
          const fallback = json.data.years[0] || "2025";
          setYear(fallback);
          setYearForm(fallback);
        }
      }
    } catch {
      setMeta(null);
    }
  }, [round, year]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const query = buildQuery({
          round: apiRound,
          year,
          page,
          limit: 50,
          rankMin,
          rankMax,
          quota,
          course,
          state,
          category,
          instituteType,
          q: quickQ,
          sort: sortApi,
        });
        const res = await fetch(`${basePath}/api/neet-counseling/allotments?${query}`);
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) throw new Error(json.message || "Failed to load");
        setItems(json.data.items || []);
        setPagination(json.data.pagination || { page: 1, total: 0, totalPages: 1 });
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Error");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    apiRound,
    year,
    page,
    rankMin,
    rankMax,
    quota,
    course,
    state,
    category,
    instituteType,
    quickQ,
    sortApi,
    filterNonce,
  ]);

  const applyFilters = () => {
    setYear(yearForm);
    setRound(roundForm);
    setRankMin(rankMinForm);
    setRankMax(rankMaxForm);
    setQuota(quotaForm);
    setCourse(courseForm);
    setState(stateForm);
    setCategory(categoryForm);
    setInstituteType(instituteTypeForm);
    setQuickQ(q.trim());
    setPage(1);
    setFilterNonce((n) => n + 1);
  };

  const reset = () => {
    const defaultYear = "2025";
    setYearForm(defaultYear);
    setYear(defaultYear);
    setRoundForm("all");
    setRound("all");
    setRankMinForm("");
    setRankMin("");
    setRankMaxForm("");
    setRankMax("");
    setQuotaForm("all");
    setQuota("all");
    setCourseForm("all");
    setCourse("all");
    setStateForm("all");
    setState("all");
    setCategoryForm("all");
    setCategory("all");
    setInstituteTypeForm("all");
    setInstituteType("all");
    setQ("");
    setQuickQ("");
    setSort("best_match");
    setPage(1);
    setFilterNonce((n) => n + 1);
  };

  const scrollToFilters = () => {
    filtersRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const count = meta?.count ?? 0;
  const rMin = meta?.rankMin;
  const rMax = meta?.rankMax;
  const colleges = meta?.uniqueCollegeNames ?? 0;
  const nri = meta?.nriCount ?? 0;
  const isRound2 = apiRound === "2";
  const isRound3 = apiRound === "3";

  const tableCols = isRound3
    ? ["S.No", "AIR", "R1 college", "R1 status", "R2 college", "R3 college", "Quota", "Course", "Outcome"]
    : isRound2
      ? ["S.No", "AIR", "R1 college", "R1 status", "R2 college", "Quota", "Course", "Seat", "Cand.", "Outcome"]
      : ["S.No", "AIR", "Quota", "Institute", "Course", "Seat", "Cand.", "Remarks"];

  const colCount = tableCols.length;

  return (
    <div className="neet-tool">
      <div className="">
        <section className="hero">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">🎯 NEET UG Counseling Insight Explorer</div>
              <h1>Website Tool Layout For Parents And Students To Track Seat Movement Smartly</h1>
              <p>
                This layout is designed for TestprepKart users who want to explore NEET counseling
                allotment data by round, college, rank, quota, category, reporting status, and upgrade
                behavior. It gives both quick insight cards and detailed results so that parents can
                understand seat trends without reading bulky PDF files.
              </p>
              <Link href={`/${examSlug}`} className="hero-back">
                ← Back to {String(examSlug).toUpperCase()} home
              </Link>
            </div>
            <div className="hero-metrics">
              <div className="metric">
                <div className="label">Primary View</div>
                <div className="value">Round Wise</div>
                <div className="note">Track allotment, reporting, upgrades, and surrender movement</div>
              </div>
              <div className="metric">
                <div className="label">Search Entry Points</div>
                <div className="value">College • Rank</div>
                <div className="note">Also filter by quota, category, state, institute type, and status</div>
              </div>
              <div className="metric">
                <div className="label">Best For</div>
                <div className="value">Parents</div>
                <div className="note">Simplified language, high-clarity labels, mobile-first layout</div>
              </div>
              <div className="metric">
                <div className="label">Output Types</div>
                <div className="value">Table + Cards</div>
                <div className="note">Detailed rows on desktop and cleaner cards for phone view</div>
              </div>
            </div>
          </div>
        </section>

        {count === 0 && !loading && (
          <div className="empty-state">
            <h3>No allotment data yet</h3>
            <p>Import the official PDF into MongoDB on your server:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }}>
              <code>npm run import:neet-counseling</code>
              <code>npm run import:neet-counseling:r2</code>
              <code>npm run import:neet-counseling:r3</code>
            </div>
            <p style={{ marginTop: 12, fontSize: 12 }}>
              R1: docs/20250813289226788.pdf · R2: docs/202509182057444522.pdf · R3: docs/202510231856675154.pdf
            </p>
          </div>
        )}

        <div className="main-grid">
          <aside ref={filtersRef} className="panel filters">
            <div className="panel-head">
              <h2>Filter Panel</h2>
              <p>Use these filters to generate the exact counseling view a parent or student wants.</p>
            </div>
            <div className="filters-body">
              <div className="field">
                <label htmlFor="neet-year">Year</label>
                <select
                  id="neet-year"
                  className="select"
                  value={yearForm}
                  onChange={(e) => setYearForm(e.target.value)}
                >
                  {(meta?.years?.length ? meta.years : ["2025", "2024", "2023"]).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="neet-round">Round Selection</label>
                <select
                  id="neet-round"
                  className="select"
                  value={roundForm}
                  onChange={(e) => setRoundForm(e.target.value)}
                >
                  <option value="all">All Rounds Combined</option>
                  <option value="1">Round 1</option>
                  <option value="2">Round 2</option>
                  <option value="3">Round 3</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="neet-college">Search By College Or Institute</label>
                <input
                  id="neet-college"
                  className="input"
                  type="text"
                  placeholder="Type college name, city, or state"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Search By Rank</label>
                <div className="range-row">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="From rank"
                    value={rankMinForm}
                    onChange={(e) => setRankMinForm(e.target.value)}
                  />
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    placeholder="To rank"
                    value={rankMaxForm}
                    onChange={(e) => setRankMaxForm(e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="neet-quota">Quota</label>
                <select id="neet-quota" className="select" value={quotaForm} onChange={(e) => setQuotaForm(e.target.value)}>
                  <option value="all">All Quotas</option>
                  <option value="ai">All India Quota</option>
                  <option value="open">Open Seat Quota</option>
                  <option value="nri">NRI Quota</option>
                  <option value="deemed">Deemed Paid Seats</option>
                  <option value="du">Delhi University Quota</option>
                  <option value="ip">IP University Quota</option>
                  <option value="esi">ESI</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="neet-cat">Candidate / Seat Category</label>
                <select id="neet-cat" className="select" value={categoryForm} onChange={(e) => setCategoryForm(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="General">General</option>
                  <option value="EWS">EWS</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="PwD">PwD</option>
                </select>
              </div>
              <div className="field">
                <label>Result Status</label>
                <div className="chips">
                  <span className="chip">Allotted</span>
                  <span className="chip">Upgraded</span>
                  <span className="chip">Reported</span>
                  <span className="chip">Not Reported</span>
                  <span className="chip">Surrendered</span>
                  <span className="chip">Fresh Allotted</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="neet-inst">Institute Type</label>
                <select
                  id="neet-inst"
                  className="select"
                  value={instituteTypeForm}
                  onChange={(e) => setInstituteTypeForm(e.target.value)}
                >
                  <option value="all">All Institute Types</option>
                  <option value="government">Government Medical College</option>
                  <option value="aiims_ini">AIIMS / INI Type</option>
                  <option value="deemed">Deemed University</option>
                  <option value="private">Private Medical College</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="neet-state">State</label>
                <select id="neet-state" className="select" value={stateForm} onChange={(e) => setStateForm(e.target.value)}>
                  <option value="all">All States</option>
                  {(meta?.states || []).map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.state} ({s.count.toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              </div>
              <div className="action-row">
                <button type="button" className="btn btn-primary" onClick={applyFilters}>
                  Apply Filters
                </button>
                <button type="button" className="btn btn-soft" onClick={reset}>
                  Reset
                </button>
              </div>
            </div>
          </aside>

          <section ref={resultsRef} className="content">
            <div className="panel">
              <div className="toolbar">
                <div className="toolbar-left">
                  <div className="segmented">
                    <button
                      type="button"
                      className={viewTab === "overview" ? "active" : ""}
                      onClick={() => setViewTab("overview")}
                    >
                      Overview
                    </button>
                    <button type="button" className={viewTab === "seat" ? "active" : ""} onClick={() => setViewTab("seat")}>
                      Seat Movement
                    </button>
                    <button type="button" className={viewTab === "college" ? "active" : ""} onClick={() => setViewTab("college")}>
                      College View
                    </button>
                    <button type="button" className={viewTab === "rank" ? "active" : ""} onClick={() => setViewTab("rank")}>
                      Rank View
                    </button>
                    <button type="button" className={viewTab === "nri" ? "active" : ""} onClick={() => setViewTab("nri")}>
                      NRI View
                    </button>
                  </div>
                </div>
                <div className="toolbar-right">
                  <div className="searchbar">
                    <span className="searchbar-icon" aria-hidden>⌕</span>
                    <input
                      className="input"
                      type="search"
                      placeholder="Quick search by college, city, quota, or category"
                      value={quickQ}
                      onChange={(e) => setQuickQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setPage(1);
                          setFilterNonce((n) => n + 1);
                        }
                      }}
                    />
                  </div>
                  <select
                    className="select sort-select"
                    style={{ width: "170px" }}
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="best_match">Sort: Best Match</option>
                    <option value="rank_asc">Lowest Rank</option>
                    <option value="rank_desc">Highest Rank</option>
                    <option value="recent_round">Recent Round</option>
                    <option value="most_changes">Most Seat Changes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="cards-row">
              <div className="stat-card">
                <div className="stat-icon">🏥</div>
                <div className="stat-label">Selected Colleges</div>
                <div className="stat-value">{colleges.toLocaleString("en-IN")}</div>
                <div className="stat-sub">Visible after current filters across all selected rounds.</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔁</div>
                <div className="stat-label">Seats With Movement</div>
                <div className="stat-value">{pagination.total.toLocaleString("en-IN")}</div>
                <div className="stat-sub">Includes upgrades, not reported cases, and surrendered seats.</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-label">Rank Range Seen</div>
                <div className="stat-value">
                  {rMin != null && rMax != null
                    ? `${rankFmt(rMin)} to ${rankFmt(rMax)}`
                    : rMin != null
                      ? rankFmt(rMin)
                      : rMax != null
                        ? rankFmt(rMax)
                        : "—"}
                </div>
                <div className="stat-sub">Useful for parents comparing safe, target, and stretch choices.</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🌍</div>
                <div className="stat-label">NRI Linked Allotments</div>
                <div className="stat-value">{nri.toLocaleString("en-IN")}</div>
                <div className="stat-sub">Dedicated quick view for NRI quota and foreign-linked seats.</div>
              </div>
            </div>

            <div className="panel table-panel">
              <div className="panel-head">
                <h3>Results Table</h3>
                <p>This is the main desktop result block. On phone, the same data can be shown as stacked cards with the same labels.</p>
              </div>

              {error && <div className="error-bar">{error}</div>}

              {loading ? (
                <div className="loading-state">
                  <div className="spinner" aria-hidden />
                  <span>Loading allotments…</span>
                </div>
              ) : (
                <>
                  <div className="table-scroll">
                    <table
                      className={`neet-table ${isRound3 ? "neet-table-r3" : isRound2 ? "neet-table-r2" : ""}`}
                    >
                      <thead>
                        <tr>
                          {tableCols.map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={colCount} style={{ textAlign: "center", padding: "48px 16px", color: "var(--neet-muted)" }}>
                              No rows match your filters. Try resetting or broadening search.
                            </td>
                          </tr>
                        ) : isRound3 ? (
                          items.map((row) => {
                            const r3col = row.round3Institute?.trim() || row.institute?.trim() || "—";
                            const out = (row.round3Outcome || row.remarks || "—").trim();
                            return (
                              <tr key={`${row.serialNo}-${row.rank}`}>
                                <td><strong>{row.serialNo}</strong></td>
                                <td><strong>{row.rank?.toLocaleString("en-IN")}</strong></td>
                                <td>
                                  <strong>{row.round1Institute?.trim() || "—"}</strong>
                                </td>
                                <td>
                                  <span className={statusTagClass(row.round1Status)}>{row.round1Status || "—"}</span>
                                </td>
                                <td>{row.round2Institute?.trim() ? row.round2Institute : "—"}</td>
                                <td>{r3col}</td>
                                <td><span className="mini">{row.quota || "—"}</span></td>
                                <td><strong>{row.course || "—"}</strong></td>
                                <td><span className="mini">{out}</span></td>
                              </tr>
                            );
                          })
                        ) : isRound2 ? (
                          items.map((row) => (
                            <tr key={`${row.serialNo}-${row.rank}`}>
                              <td><strong>{row.serialNo}</strong></td>
                              <td><strong>{row.rank?.toLocaleString("en-IN")}</strong></td>
                              <td><strong>{row.round1Institute || "—"}</strong></td>
                              <td><span className={statusTagClass(row.round1Status)}>{row.round1Status || "—"}</span></td>
                              <td>{row.round2Institute ? row.round2Institute : "—"}</td>
                              <td><span className="mini">{row.quota}</span></td>
                              <td><strong>{row.course}</strong></td>
                              <td><span className="mini">{row.allottedCategory || "—"}</span></td>
                              <td><span className="mini">{row.candidateCategory || "—"}</span></td>
                              <td><span className="mini">{row.round2Outcome || row.remarks || "—"}</span></td>
                            </tr>
                          ))
                        ) : (
                          items.map((row) => (
                            <tr key={`${row.serialNo}-${row.rank}`}>
                              <td><strong>{row.serialNo}</strong></td>
                              <td><strong>{row.rank?.toLocaleString("en-IN")}</strong></td>
                              <td><span className="mini">{row.quota}</span></td>
                              <td><strong>{row.institute}</strong></td>
                              <td><strong>{row.course}</strong></td>
                              <td><span className="mini">{row.allottedCategory || "—"}</span></td>
                              <td><span className="mini">{row.candidateCategory || "—"}</span></td>
                              <td><span className="mini">{row.remarks || "—"}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mobile-cards">
                    {items.length === 0 ? (
                      <p className="mini" style={{ textAlign: "center", padding: 24 }}>No matching rows.</p>
                    ) : (
                      items.map((row) => (
                        <article key={`m-${row.serialNo}-${row.rank}`} className="mobile-card">
                          <div className="mobile-card-air">AIR {row.rank?.toLocaleString("en-IN")}</div>
                          {isRound3 && (
                            <>
                              {row.round1Institute?.trim() && (
                                <>
                                  <div className="mobile-card-section">Round 1</div>
                                  <p className="mobile-card-text">{row.round1Institute}</p>
                                  <p className="mini">{row.round1Status || "—"}</p>
                                </>
                              )}
                              {row.round2Institute?.trim() && (
                                <>
                                  <div className="mobile-card-section">Round 2</div>
                                  <p className="mobile-card-text">{row.round2Institute}</p>
                                </>
                              )}
                              <div className="mobile-card-section">Round 3 / current</div>
                              <p className="mobile-card-text">{row.round3Institute?.trim() || row.institute || "—"}</p>
                            </>
                          )}
                          {isRound2 && !isRound3 && (
                            <>
                              <div className="mobile-card-section">Round 1</div>
                              <p className="mobile-card-text">{row.round1Institute}</p>
                              <p className="mini">{row.round1Status || "—"}</p>
                              {row.round2Institute && (
                                <>
                                  <div className="mobile-card-section">Round 2</div>
                                  <p className="mobile-card-text">{row.round2Institute}</p>
                                </>
                              )}
                            </>
                          )}
                          {!isRound2 && !isRound3 && (
                            <>
                              <p className="mini">{row.quota}</p>
                              <p className="mobile-card-text">{row.institute}</p>
                            </>
                          )}
                          <div className="mobile-card-section">Course · Quota</div>
                          <p className="mobile-card-text">{row.course || "—"} · {row.quota || "—"}</p>
                          <div className="mobile-card-section">Remarks</div>
                          <p className="mini">{row.round3Outcome || row.round2Outcome || row.remarks || "—"}</p>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="pagination-bar">
                    <button
                      type="button"
                      className="btn btn-soft"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="pagination-info">
                      Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
                      <span style={{ display: "block", fontSize: 11, marginTop: 2 }}>
                        ({pagination.total.toLocaleString("en-IN")} rows)
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-soft"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="bottom-grid">
              <div className="panel">
                <div className="panel-head">
                  <h3>Suggested insight widgets</h3>
                  <p>Decision-friendly blocks below the table.</p>
                </div>
                <div className="insight-list">
                  <div className="insight">
                    <div className="insight-icon">📍</div>
                    <div>
                      <h4>College trend snapshot</h4>
                      <p>See how often a college appeared across rounds, which quota was active, and whether seats stayed stable or moved.</p>
                    </div>
                  </div>
                  <div className="insight">
                    <div className="insight-icon">🎓</div>
                    <div>
                      <h4>Rank-based possibility</h4>
                      <p>Enter a rank to see likely colleges, stretch choices, and where later-round movement historically helped.</p>
                    </div>
                  </div>
                  <div className="insight">
                    <div className="insight-icon">🌐</div>
                    <div>
                      <h4>NRI counseling lens</h4>
                      <p>Isolate NRI quota, deemed, and foreign-linked allotments in one view.</p>
                    </div>
                  </div>
                  <div className="insight">
                    <div className="insight-icon">🔎</div>
                    <div>
                      <h4>Status explainers</h4>
                      <p>Reported, Upgraded, Fresh Allotted, Not Reported, Surrendered — what each term means for the seat.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-head">
                  <h3>How to use</h3>
                  <p>Best way to use this tool on desktop and phone.</p>
                </div>
                <div className="insight-list">
                  <div className="insight">
                    <div className="insight-icon">1</div>
                    <div>
                      <h4>Hero + quick search</h4>
                      <p>Search by college, rank, or quota at the top to start quickly.</p>
                    </div>
                  </div>
                  <div className="insight">
                    <div className="insight-icon">2</div>
                    <div>
                      <h4>Sticky filters (desktop)</h4>
                      <p>Filter panel stays on the left while you scroll the result list.</p>
                    </div>
                  </div>
                  <div className="insight">
                    <div className="insight-icon">3</div>
                    <div>
                      <h4>Cards on mobile</h4>
                      <p>Each row becomes a card on small screens; use bottom nav to jump to filters or results.</p>
                    </div>
                  </div>
                  <div className="insight">
                    <div className="insight-icon">4</div>
                    <div>
                      <h4>Round &amp; year</h4>
                      <p>Switch round (1–3) and year to compare allotment data across cycles.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="disclaimer">
              <strong>Disclaimer:</strong> For exploration only. If category or quota changes, follow MCC rules (relieving letter, fresh admission letter). Always confirm on the official MCC website.
            </div>
          </section>
        </div>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <div className="nav-grid">
          <button type="button" className="mobile-item active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            🏠 <span>Home</span>
          </button>
          <button type="button" className="mobile-item" onClick={scrollToFilters}>
            🧮 <span>Filters</span>
          </button>
          <button type="button" className="mobile-item" onClick={scrollToResults}>
            📊 <span>Results</span>
          </button>
          <button type="button" className="mobile-item" onClick={scrollToResults}>
            💾 <span>Saved</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

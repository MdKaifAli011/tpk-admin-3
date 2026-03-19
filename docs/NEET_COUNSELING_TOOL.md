# NEET Counseling Seat Allotment Tool

## URL

- **Production path:** `{basePath}/neet/tool` (e.g. `/self-study/neet/tool`)
- **Only NEET:** `/jee/tool`, etc. return **404**.

## Import PDFs into MongoDB

| Round | Command | Default PDF |
|-------|---------|-------------|
| **1** | `npm run import:neet-counseling` | `docs/20250813289226788.pdf` |
| **2** | `npm run import:neet-counseling:r2` | `docs/202509182057444522.pdf` |
| **3** | `npm run import:neet-counseling:r3` | `docs/202510231856675154.pdf` |

Options (all commands):

- `--dry-run` — parse only, no DB write
- `--pdf=path/to/file.pdf` — override PDF path
- `--round=1`, `--round=2`, or `--round=3` — which dataset to replace in DB

Rounds **1–3** are stored separately (`round: "1"` / `"2"` / `"3"`). The tool UI has a **Round** dropdown.

### Round 2 PDF format

MCC Round 2 lists **Round 1** seat + status (Reported / Not Reported), then **Round 2** upgrade (if any) or text outcome (e.g. *Did not opt for Upgradation*, *Upgraded*, *Did not fill up fresh choices*).

Parsed fields include: `round1Institute`, `round1Status`, `round2Institute` (if upgraded), `round2Outcome`, plus effective `quota` / `institute` / `course` for search (R2 seat when upgraded, else R1).

Expect **~35,400+ rows** for the 2025 Round 2 file.

### Round 3 PDF format

MCC Round 3 is **rank-first** (no S.No in PDF). Import uses **row order** as `serialNo`. Each row can show **Round 1 → Round 2 → Round 3** seat flow (dashes separate blocks). Parsed fields: `round1*`, `round2*`, `round3Quota` / `round3Institute` / `round3Course` / `round3Status` / `round3OptionNo` / `round3Outcome`, plus effective `quota` / `institute` / `course` for filters (usually the latest seat).

College search in the API for `round=3` matches **R1, R2, or R3** institute names.

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/neet-counseling/meta?round=1` \| `2` \| `3` | Counts, AIR range, colleges, NRI count, states |
| `GET /api/neet-counseling/allotments?round=3&...` | Filtered rows for that round |

## Model

`NeetCounselingAllotment` — Round 1: classic columns. Round 2 adds `round1*`, `round2*`. Round 3 adds `round3*`.

## UI

Tailwind-only. Round 2: R1/R2 columns. Round 3: R1, R2, R3 colleges + outcome.

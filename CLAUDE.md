# CLAUDE.md — Modern Self-Manager

## Project Overview

**Modern Self-Manager** (Yönetim Sistemi) is a personal productivity management system originally built as a personal tool, currently used by a small group of users (3–4 people). It consolidates task management, finance tracking, and Google Calendar sync into one dark-mode web app.

**Production URL:** https://todo.alidiyarduran.com

**Key capabilities:**
- Hierarchical task management with unlimited subtask depth, organized across named Workspaces
- Finance tracking: income/expense transactions, obligations (borç/alacak), recurring templates, asset value calculator (gold, silver, forex)
- Google Calendar integration (OAuth2, bidirectional event management)
- AI-powered features: natural language task input, photo-to-task recognition, subtask generation (OpenAI GPT-4 / Vision)
- Real-time data sync via Supabase Postgres Changes

**UI language:** Turkish. **Code language:** English.

---

## Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build tool | Vite 5 |
| Routing | React Router 6 |
| Styling | Tailwind CSS 3 (dark mode, glass morphism) |
| Animations | Framer Motion 10 |
| Drag-and-drop | @dnd-kit |
| Calendar UI | react-big-calendar (Turkish locale via date-fns) |
| Charts | Recharts |
| Icons | lucide-react |

### Backend / Infra
| Layer | Technology |
|-------|-----------|
| Database + Auth + Realtime | Supabase (Postgres + RLS + Realtime) |
| File Storage | Supabase Storage (private bucket, signed URLs only) |
| Serverless API | Vercel Functions (TypeScript, in `/api`) |
| Deployment | Vercel Hobby plan |

### External Services
| Service | Purpose |
|---------|---------|
| OpenAI GPT-4 | Subtask generation, task NLP parsing |
| OpenAI GPT-4 Vision | Photo-to-task recognition |
| Google Calendar API | OAuth2, event CRUD |
| CollectAPI | Gold/silver price data |
| Frankfurter.app | Currency exchange rates |

---

## Directory Structure

```
/
├── api/                              # Vercel serverless functions (server-side only)
│   ├── ai/
│   │   ├── generate-subtasks.ts      # GPT-4: generate subtasks from task title
│   │   ├── analyze-photo.ts          # GPT-4 Vision: extract tasks from image
│   │   └── parse-task.ts             # GPT-4: natural language → task fields
│   ├── finance/
│   │   └── asset-prices.ts           # Gold/silver/forex prices (24h Supabase cache)
│   ├── calendar/
│   │   ├── auth/connect.ts           # Initiate Google OAuth
│   │   ├── auth/callback.ts          # Handle OAuth callback, store tokens in DB
│   │   ├── auth/disconnect.ts        # Revoke and delete tokens
│   │   ├── calendars.ts              # List user's Google Calendars
│   │   ├── events.ts                 # GET list / POST create event
│   │   ├── events/[id].ts            # DELETE / PATCH single event
│   │   └── _lib/
│   │       ├── tokenRefresh.ts       # Google OAuth token refresh logic
│   │       └── dateFormat.ts
│   └── _lib/
│       └── supabase.ts               # Supabase server client (service role key)
│
├── database/
│   ├── finance_schema.sql            # Finance module migration SQL
│   └── decision_log_*.md             # Architectural decision records (ADRs)
│
├── rules/                            # Architecture governance (always-on)
│   ├── 00_core_principles.md         # System philosophy and anti-patterns
│   ├── 01_architecture_overview.md
│   ├── 02_database_schema_rules.md
│   ├── 03_ai_operation_protocol.md
│   └── 04_decision_log_template.md
│
├── src/
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Router + context provider tree
│   ├── index.css                     # Global styles
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SignUpPage.tsx
│   │   ├── HomePage.tsx              # Main hub: Tasks / Calendar / Finance tabs
│   │   └── CalendarPage.tsx          # Full-page calendar (react-big-calendar)
│   │
│   ├── components/
│   │   ├── AuthForm.tsx
│   │   ├── Header.tsx / Layout.tsx / ProtectedRoute.tsx
│   │   ├── TaskForm.tsx / TaskList.tsx / Task.tsx / TaskFilters.tsx
│   │   ├── WorkspaceNavigation.tsx / CreateWorkspaceModal.tsx
│   │   ├── NaturalLanguageInput.tsx  # Calls /api/ai/parse-task
│   │   ├── PhotoTaskRecognition.tsx  # Calls /api/ai/analyze-photo
│   │   ├── AISuggestionsModal.tsx    # Calls /api/ai/generate-subtasks
│   │   ├── TagInput.tsx / TagBadge.tsx / TagSelector.tsx / TagManagementModal.tsx
│   │   ├── UndoSnackbar.tsx / Portal.tsx / SkeletonLoader.tsx / ConfirmDialog.tsx
│   │   ├── ImageAttachmentModal.tsx / LinkAttachmentModal.tsx / TaskPreviewModal.tsx
│   │   ├── BackgroundImageUpload.tsx / AvatarUploadModal.tsx
│   │   └── calendar/
│   │       ├── CalendarSidebar.tsx / WeekView.tsx / DayModal.tsx
│   │       ├── EventBlock.tsx / EventFormModal.tsx / EventDetailsModal.tsx
│   │       ├── OverlapEventsModal.tsx / LocationAutocomplete.tsx / Tooltip.tsx
│   │       └── RBCTheme.css          # react-big-calendar style overrides
│   │
│   ├── contexts/                     # All global state (React Context API)
│   │   ├── AuthContext.tsx           # User auth + profile (avatar, display name)
│   │   ├── WorkspacesContext.tsx     # Workspace CRUD + realtime
│   │   ├── TasksContext.tsx          # Tasks CRUD + optimistic updates + realtime
│   │   ├── TagsContext.tsx           # Tag CRUD + task-tag associations
│   │   ├── CalendarContext.tsx       # Google Calendar state + event cache
│   │   ├── FinanceContext.tsx        # Finance domain state
│   │   ├── AttachmentsContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── UndoSnackbarContext.tsx
│   │
│   ├── domains/
│   │   └── finance/
│   │       ├── FinancePage.tsx             # Tabbed finance UI
│   │       ├── types/finance.types.ts      # All finance TypeScript types
│   │       ├── services/
│   │       │   ├── finance.service.ts      # All finance DB queries
│   │       │   └── assets.service.ts       # Asset price fetching + caching
│   │       └── components/
│   │           ├── FinanceDashboard.tsx
│   │           ├── TransactionSection.tsx / TransactionForm.tsx
│   │           ├── ObligationSection.tsx
│   │           ├── RecurringSection.tsx
│   │           ├── AssetsSection.tsx / AssetCalculator.tsx
│   │           ├── CategoryManager.tsx
│   │           └── ReceiptViewer.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts               # Supabase browser client (lazy init, anon key only)
│   │   ├── openai.ts                 # Client wrappers that call /api/ai/* endpoints
│   │   ├── googleCalendar.ts         # Google Calendar client utilities
│   │   ├── storage.ts                # File upload / signed URL helpers
│   │   ├── financeStorage.ts         # Receipt file helpers
│   │   └── pdfToImage.ts             # PDF → image conversion (pdfjs-dist)
│   │
│   ├── utils/
│   │   ├── taskUtils.ts              # buildTaskTree(), flattenTaskTree(), calculateCompletionPercentage()
│   │   ├── dateUtils.ts              # parseRelativeDate(), parseTime(), combineDateTime()
│   │   ├── colorUtils.ts             # getColorIdFromHex(), getColorHexFromId()
│   │   ├── calendarUtils.ts          # Calendar date/time helpers
│   │   └── eventOverlap.ts           # Calendar event overlap detection
│   │
│   ├── types/
│   │   ├── database.ts               # Auto-generated Supabase types — DO NOT edit manually
│   │   └── task.ts / workspace.ts / tag.ts / calendar.ts / attachment.ts
│   │
│   └── config/
│       └── calendarTheme.ts          # react-big-calendar color/style config
│
├── index.html                        # HTML shell (lang="tr", dark class on root)
├── vite.config.ts                    # Vite config + /api proxy → localhost:3000
├── tailwind.config.js                # Custom colors, animations, glass morphism
├── vercel.json                       # Vercel build config + SPA rewrite rules
└── package.json
```

**Safe to delete (unreferenced):**
- `google_calendar_backup/` — deprecated backup calendar implementation, zero references in codebase
- `test-ddg.js` — scratch file in root, zero references

---

## Running Locally

### Prerequisites
- Node.js 18+
- Vercel CLI: `npm i -g vercel` (required to run serverless functions locally)

### Environment Variables

Create `.env.local`:

```bash
# Supabase (safe to expose in browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OpenAI — server-side only, NEVER prefix with VITE_
OPENAI_API_KEY=sk-...

# Google Calendar OAuth — server-side only, NEVER prefix with VITE_
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/auth/callback
```

### Start dev server

```bash
npm install
vercel dev        # Runs Vite frontend + Vercel functions together
```

> Do **not** use `npm run dev` alone if you need AI or Calendar features — those require the Vercel function runtime. `vercel dev` proxies `/api/*` through the function runtime automatically.

### Production build

```bash
npm run build     # Outputs to dist/
```

---

## Architecture & Key Decisions

### Strict Layered Architecture

```
Client UI (React components)
         ↓
Contexts (global state — React Context API)
         ↓
/api/* Vercel serverless functions  ← server boundary
         ↓
Service layer (src/domains/*/services/ or lib/)
         ↓
Supabase (Postgres + Storage + Auth)
```

No layer may skip another. **Client components never write directly to Supabase.** All mutations travel through a context method → API route → service layer → DB.

### Domain Isolation

Five domains, none mutates another's data:

| Domain | Location |
|--------|----------|
| Todo | `src/contexts/`, `src/components/` |
| Finance | `src/domains/finance/` |
| Storage | `src/lib/storage.ts`, `src/lib/financeStorage.ts` |
| Auth | `src/contexts/AuthContext.tsx`, Supabase Auth |
| Integrations | `api/calendar/`, `src/contexts/CalendarContext.tsx` |

### Optimistic Updates (TasksContext)

Tasks update in the UI immediately before the DB confirms. A `pendingUpdates: Map<id, PendingUpdate>` inside `TasksContext` prevents the subsequent Realtime event from re-applying the same change.

### Finance: Integer Currency

All monetary amounts are stored as **BIGINT in kuruş** (1 TL = 100 kuruş). **Never use floats for money.** Never store computed or derived balances — always calculate at read time via `SUM()`.

### Task Hierarchy

Tasks use an **adjacency list** (`parent_task_id`). The tree is assembled in the frontend via `buildTaskTree()` in `src/utils/taskUtils.ts`. Completion percentage is computed recursively and **never stored in the DB**.

### Google Calendar Tokens

OAuth tokens are stored **server-side only** in the `google_calendar_tokens` Supabase table. They are never sent to the browser. All Calendar API calls pass through `/api/calendar/*`.

### Vercel Function Limit

The project is on the **Hobby plan (12 serverless function limit)**. This limit is currently reached. Do not add new files under `/api/` without removing an existing one or upgrading the Vercel plan.

### Asset Price Caching

`/api/finance/asset-prices.ts` caches gold/silver/forex results in Supabase for 24 hours to minimize external API calls and stay within function invocation budgets.

---

## Coding Conventions

- **TypeScript strict mode** — no `any`, no implicit nulls. Use types from `src/types/` or `src/domains/*/types/`.
- **`src/types/database.ts` is auto-generated** — never edit manually. Regenerate via Supabase CLI (`supabase gen types typescript`) after schema changes.
- **Finance amounts** — always `BIGINT` (kuruş). Never `number` with decimals, never `numeric(10,2)`.
- **No stored computed values** — no `balance`, `progress`, `aggregated_total`, or `remaining_amount` columns in the DB. Calculate at read time.
- **No direct Supabase writes from components** — always go through a context method.
- **Domain boundaries** — finance service files stay in `src/domains/finance/services/`. Todo logic stays in contexts. Never cross-import for mutations.
- **Soft deletes** — use `is_active`, `is_archived`, or `deleted_at`. Never hard-delete user data.
- **File storage** — always use signed URLs. Never use public bucket URLs.
- **Styling** — Tailwind only. Do not add new CSS files. The only exception is `src/components/calendar/RBCTheme.css` for react-big-calendar overrides.
- **Animations** — use Framer Motion for transitions and modals. Do not use raw CSS `transition` classes for complex motion.
- **UI text** — all user-facing strings must be in Turkish to match the existing UI.
- **Schema changes** — every change requires a decision log entry in `database/` following `rules/04_decision_log_template.md`, including risk analysis and rollback plan.

---

## Do NOT Change Without Asking

| File / Area | Reason |
|-------------|--------|
| `src/types/database.ts` | Auto-generated; regenerate via Supabase CLI, do not edit |
| `vercel.json` | SPA rewrite rules; changes can break client-side routing |
| `api/_lib/supabase.ts` | Uses service role key; security-critical |
| `api/calendar/auth/callback.ts` | OAuth flow; breakage locks out all users from Google Calendar |
| Finance `amount` column types | The kuruş/BIGINT convention is load-bearing; changing to float corrupts financial data |
| Any RLS policy | Every table enforces `user_id = auth.uid()`; never weaken |
| `/api` function count | At the Vercel Hobby 12-function limit; adding functions requires removing one or upgrading |
| `rules/` directory | Architecture governance documents — not suggestions |

---

## Known Issues & TODOs

- **`amount_try` migration (Pending)** — A `amount_try BIGINT` column (historical TL equivalent for foreign-currency transactions) is planned for `finance_transactions`. The corresponding `exchange-rates` API endpoint was removed to stay under the function limit, which blocks this feature. Do not implement until the function count issue is resolved. Reference: `database/decision_log_2026_02_21_01.md`.

- **Finance has no Realtime subscription** — `FinanceContext` does not subscribe to Supabase Postgres Changes. Acceptable for current usage, but changes made by one session will not appear in another without a page refresh.

- **Recurring transaction templates** — V1 is manual-trigger only (no cron/scheduler). Automatic scheduling is a future feature.

- **`src/types/database.ts` may be stale** — if schema migrations have been applied in Supabase without regenerating this file, types will be out of sync. Regenerate when in doubt.

- **`google_calendar_backup/`** — unreferenced deprecated directory, safe to delete.

- **`test-ddg.js`** — unreferenced scratch file in project root, safe to delete.

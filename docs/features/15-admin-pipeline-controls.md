# Admin Pipeline Controls

**Implemented:** Pipeline controls page at `/admin/pipeline`; nav link in admin layout. Uses existing API routes: `POST /api/admin/pipeline/discover`, `acquire`, `process`, `snapshot`. See [docs/features/03-discovery-pipeline.md](03-discovery-pipeline.md), [04-acquisition-pipeline.md](04-acquisition-pipeline.md), [05-signal-processing.md](05-signal-processing.md).

## Goal

Provide clear, labeled controls in the admin panel for manually triggering each step of the AGI Canary data pipeline. The pipeline API routes already exist; this feature adds the UI layer so admins can run Discovery, Acquisition, Signal Processing, and Snapshot generation without using curl or the browser console.

## User Story

As an administrator of the AGI Canary Watcher, I want to trigger each pipeline step from the admin panel, so that I can manually run or debug the data pipeline without calling APIs directly.

## Functional Requirements

1. **Pipeline Page**

   - New page at `/admin/pipeline` under admin layout
   - Protected by Clerk middleware (same as other admin routes)
   - Nav link "Pipeline" added to admin layout between Home and Sources

2. **Four Pipeline Step Cards**

   - Displayed in logical order: Discover → Acquire → Process → Snapshot
   - Each card has: title, description, trigger button, optional controls, result area
   - Loading state while request is in flight (disabled button, spinner)
   - Result area shows stats from API response or error message after run

3. **Step-Specific Controls**

   - **Discover:** Checkbox "Dry run (no DB writes)" — sends `{ dryRun: true }` when checked
   - **Acquire:** No optional params in MVP (sends empty body)
   - **Process:** No optional params in MVP (sends empty body)
   - **Snapshot:** Date input (YYYY-MM-DD), default today — sends `{ date: string }`

4. **Error Handling**

   - Show API error messages via toast and in result area
   - 503 responses (e.g. ACQUISITION_WORKER_URL not configured) display clear error
   - Network failures show user-friendly message

5. **Success Feedback**

   - Toast on successful run with summary (e.g. "12 items inserted, 3 sources succeeded")
   - Result area shows detailed stats: items inserted, documents acquired, signals created, duration

## Data Requirements

**No new database tables.** Uses existing pipeline API routes. No schema changes.

## User Flow

### Triggering a Pipeline Step

1. Admin signs in and navigates to `/admin/pipeline`
2. Admin sees four cards: Discovery, Acquisition, Signal Processing, Snapshot
3. For Discovery: optionally check "Dry run" if testing without DB writes
4. For Snapshot: optionally change date from default (today)
5. Admin clicks trigger button (e.g. "Run Discovery")
6. Button shows loading state; request is sent to corresponding API
7. On success: toast shows summary; result area below button shows detailed stats
8. On failure: toast shows error; result area may show API error message

### Error Scenarios

- **ACQUISITION_WORKER_URL not set:** Acquire API returns 503; toast and result show error
- **OPENROUTER_API_KEY not set:** Discover/Process return 500/503; clear error displayed
- **R2_BUCKET_NAME not set:** Process returns 503; clear error displayed

## Acceptance Criteria

- [x] Pipeline page exists at `/admin/pipeline`
- [x] Admin nav includes Pipeline link
- [x] Four step cards displayed in order: Discover, Acquire, Process, Snapshot
- [x] Discover has dry run checkbox; Snapshot has date input
- [x] Each step has trigger button with loading state
- [x] Result area shows stats or error after run
- [x] Toasts on success and failure
- [x] Page uses shadcn Card, Button, Checkbox, Input; matches admin styling

## Edge Cases

1. **Long-running requests (5 min max)**

   - Expected behavior: Button stays in loading state; user waits or refreshes
   - Handling strategy: API routes use `maxDuration: 300`; no client timeout

2. **Multiple rapid clicks**

   - Expected behavior: Button disabled while loading; only one request in flight per step
   - Handling strategy: `disabled={loading}` on trigger button

3. **Invalid snapshot date**

   - Expected behavior: Validation before request; toast if format wrong
   - Handling strategy: Client checks YYYY-MM-DD; API also validates

4. **API returns non-JSON (e.g. 502 from upstream)**
   - Expected behavior: Catch block shows generic error
   - Handling strategy: `res.json().catch(() => ({}))`; show `data.error ?? "Failed"`

## Non-Functional Requirements

**Technical:**

- Use existing patterns from admin/sources (SWR, toast, shadcn components)
- Client component (`"use client"`) for interactivity
- No new API routes; call existing `/api/admin/pipeline/*` endpoints

**UX:**

- Clear labels and descriptions for each step
- Loading state prevents accidental double-submit
- Success/error feedback via toast and inline result

**Security:**

- All API calls go through existing auth-protected routes
- Clerk middleware protects `/admin`; no additional auth logic needed

**References:**

- [03-discovery-pipeline.md](03-discovery-pipeline.md)
- [04-acquisition-pipeline.md](04-acquisition-pipeline.md)
- [05-signal-processing.md](05-signal-processing.md)

# 📋 HANDOFF DOCUMENT - CISMM X-Connect Project

**Project**: CISMM X-Connect PWA  
**Date**: April 9, 2026  
**Status**: Development Phase - Active Remediation  
**Version**: 0.0.0  
**Last Updated**: 2026-04-09 (admin boundary closed for privileged writes)

---

## 📌 Executive Summary

CISMM X-Connect is a **Progressive Web Application (PWA)** for managing conference/exhibition attendee experiences. The application includes QR code scanning, gamification, agenda management, exhibitor tracking, and user networking features.

**Current Status**: Functional MVP with Phase 1 client-side remediation already started, but still not production-ready.

**Critical Issues**: Original Phase 1 runtime issues were addressed in the working tree, but production is still blocked by remaining security hardening and QR architecture follow-up.  
**Important Issues**: 7 code quality issues  
**Technical Debt**: Medium

---

## 🔄 Recent Update (2026-04-09)

### ✅ Admin Flow / Deletion Remediation Completed

1. **Privileged login no longer crashes to a white screen**
   - `LoginView.tsx` now tears down `html5-qrcode` safely when switching out of scanner mode
   - `LoginView` is wrapped by `ErrorBoundary` in `App.tsx` when unauthenticated so future runtime errors do not blank the whole app

2. **Service worker caching was corrected**
   - `public/sw.js` no longer aggressively caches the main app shell or source-entry paths
   - caching is now limited to avatar storage assets
   - `App.tsx` now unregisters stale service workers automatically in local development
   - this was necessary because the browser was serving stale admin bundles and requiring hard refreshes

3. **`manage-users` is now the admin account-management boundary**
   - `supabase/functions/manage-users/index.ts` now supports:
     - `CREATE_STAFF`
     - `DELETE_USER`
     - `DELETE_EXHIBITOR`
   - the function now stores `email` in `profiles` when creating staff accounts
   - delete flows now guard against:
     - deleting the currently logged-in admin
     - deleting the last remaining admin
     - orphaned `profiles` rows when an Auth user is already missing

4. **Admin UI now routes destructive privileged actions through the Edge Function**
   - `AdminView.tsx` now deletes staff users through `manage-users`
   - exhibitor deletion no longer calls `/rest/v1/exhibitors` directly
   - instead it calls `DELETE_EXHIBITOR`, which removes linked exhibitor staff accounts first and then deletes the exhibitor row safely
   - admin user lists are refreshed after create/delete operations so the panel no longer relies on manual hard refreshes for those actions

5. **Remote database cleanup migrations were applied successfully**
   - `20260409011500_user_management_cleanup.sql`
     - backfilled missing `profiles.email` values from `auth.users`
     - changed `news_posts.author_id` foreign key to `ON DELETE SET NULL`
   - `20260409013000_profiles_auth_delete_cascade.sql`
     - changed `profiles.id -> auth.users.id` to `ON DELETE CASCADE`

6. **Admin content boundary work started for exhibitors + categories**
   - `manage-users` now also supports:
     - `CREATE_EXHIBITOR`
     - `UPDATE_EXHIBITOR`
     - `CREATE_EXHIBITOR_CATEGORY`
     - `UPDATE_EXHIBITOR_CATEGORY`
     - `DELETE_EXHIBITOR_CATEGORY`
   - `AdminView.tsx` no longer mutates `exhibitors` or `exhibitor_categories` directly for those admin actions
   - after these mutations, the admin panel now refreshes exhibitor/category state from read-only queries instead of relying on stale local state

7. **Admin content boundary expanded to speakers + agenda sessions**
   - `manage-users` now also supports:
     - `CREATE_SPEAKER`
     - `UPDATE_SPEAKER`
     - `DELETE_SPEAKER`
     - `CREATE_SESSION`
     - `UPDATE_SESSION`
     - `DELETE_SESSION`
   - `AdminView.tsx` no longer mutates `speakers`, `agenda_sessions`, or `session_speakers` directly for admin writes
   - agenda writes now flow through the Edge Function, which:
     - normalizes `speakerIds`
     - validates that referenced speakers exist before saving the session
     - rewrites the `session_speakers` bridge table from the privileged boundary
   - deleting a speaker now relies on the existing `session_speakers -> speakers ON DELETE CASCADE` relationship, and the admin UI refreshes both speakers and agenda state afterward so stale `speakerIds` do not linger in memory
   - speaker-linked app-account creation is still separate from speaker-content creation; this keeps the current UX intact, but it is still not a fully transactional "create speaker + create staff account" flow

8. **Remaining privileged client writes were moved behind the Edge Function**
   - `manage-users` now also supports:
     - `CREATE_NEWS_POST`
     - `DELETE_NEWS_POST`
     - `RESET_USER_DEVICES`
   - `App.tsx` no longer inserts or deletes `news_posts` directly from the client
   - `AdminView.tsx` no longer updates `profiles.registered_devices` / `profiles.device_id` directly for device resets
   - the function now uses action-based authorization:
     - admin-only for user/content/device management actions
     - admin or exhibitor for news-post creation and deletion
     - delete-news authorization is enforced server-side so exhibitors can only remove their own posts

9. **Speaker role alignment was fixed**
   - remote `profiles_role_check` now allows `speaker` in addition to `admin`, `exhibitor`, and `attendee`
   - new migration added: `20260409014500_allow_speaker_role_in_profiles.sql`
   - `types.ts` now includes `speaker` in `UserRole`
   - `CREATE_STAFF` in `manage-users` now attempts to roll back the Auth user automatically if `profiles` insert fails, to avoid leaving orphaned Auth users after partial failures
   - one orphaned Auth user from a pre-fix failed speaker-account attempt was detected during verification; if the same email is retried and Supabase reports duplicate email, that orphan account must be deleted first from Supabase Auth

10. **Attendee categories now support `VIP` and `Juez`**
   - new migration added and applied remotely: `20260409020000_add_attendee_category_to_profiles.sql`
   - `public.profiles` now has `attendee_category` with allowed values:
     - `general`
     - `vip`
     - `juez`
   - this was intentionally modeled as an attendee classification, not as an authorization role, so `VIP` and `Juez` retain attendee behavior and do not inherit admin/staff permissions
   - QR login now maps attendee category from common QR fields when present, including tolerant support for:
     - `attendeeCategory`
     - `attendee_category`
     - `category`
     - `userType`
     - `badgeType`
     - `segment`
   - vCard parsing now also supports explicit category fields such as `CATEGORIES`, `CATEGORY`, `X-CISMM-CATEGORY`, and `X-ATTENDEE-CATEGORY`
   - profile/admin UI now surfaces the category visually so attendee records can be distinguished as `General`, `VIP`, or `Juez`

11. **Manual attendee account creation now supports `General`, `VIP`, and `Juez`**
   - the Admin account-creation modal now supports role `attendee`
   - when `attendee` is selected, the admin can choose:
     - `General`
     - `VIP`
     - `Juez`
   - `CREATE_STAFF` now accepts `attendeeCategory` and persists it into `profiles.attendee_category`
   - manually created attendee accounts also get `track = 'General'` so they do not lose agenda visibility on Friday track-filtered sessions
   - this now supports the operational workflow where the organizer creates attendee accounts one by one and sends credentials manually, without relying on the printed QR to include category metadata

12. **VIP and `Juez` are now first-class options in the admin creation modal**
   - the account-creation selector now exposes:
     - `Invitado VIP`
     - `Juez`
     - `Asistente General`
     - `Ponente`
     - `Expositor`
     - `Administrador`
   - this is intentionally a UI/operational distinction layered over the same secure profile model:
     - `VIP` and `Juez` are created from dedicated options in the admin panel
     - they are persisted internally as `role = 'attendee'` plus `attendee_category = 'vip' | 'juez'`
   - this preserves attendee-level permissions while matching the organizer workflow of onboarding those groups as distinct profile types rather than as generic attendee records

13. **Speaker and exhibitor accounts now belong to their own tabs**
   - new migration added and applied remotely: `20260409021500_add_speaker_id_to_profiles.sql`
   - `profiles` now gains a `speaker_id` relationship so speaker app-accounts can be linked to a real speaker record, just like exhibitor accounts already rely on `exhibitor_id`
   - `manage-users CREATE_STAFF` now validates those links before creating:
     - speaker accounts require a valid `speaker_id`
     - exhibitor accounts require a valid `exhibitor_id`
   - `AdminView.tsx` now creates speaker/exhibitor access directly from the `Ponentes` and `Expositores` forms
   - this works both:
     - when creating a brand-new speaker/exhibitor
     - when editing an existing speaker/exhibitor that still has no linked account
   - when an account is already linked, the form now shows the linked login instead of offering a duplicate-creation flow
   - `Usuarios y Dispositivos` is now focused on manual admin/attendee onboarding plus device resets, which keeps speaker/exhibitor identity data and access provisioning inside the tabs where bio, links, stand info, and company context are actually edited

14. **Storage now moves toward low-egress image handling**
   - new migration added and applied remotely: `20260409023000_storage_image_buckets_and_policies.sql`
   - storage layout now targets three public image buckets:
     - `avatars`
     - `speakers`
     - `exhibitors`
   - bucket-level restrictions are now part of the repo:
     - `avatars`: JPEG/PNG/WEBP, ~256 KB limit
     - `speakers`: JPEG/PNG/WEBP, ~300 KB limit
     - `exhibitors`: JPEG/PNG/WEBP/SVG, ~200 KB limit
   - new storage policies allow:
     - public reads for `speakers` and `exhibitors`
     - admin-managed uploads/updates/deletes for speaker and exhibitor images
     - authenticated users to delete their own previous avatar objects
   - `utils/storageImages.ts` now centralizes:
     - client-side compression
     - public upload URL generation
     - cleanup of replaced files
   - `ProfileView.tsx` now uses that helper for attendee avatar uploads, so profile photos keep the compression step and also clean up the previous file when replaced
   - `AdminView.tsx` speaker/exhibitor forms now support direct file upload in addition to manual URLs, and uploaded assets are compressed before being sent to Storage
   - `public/sw.js` now locally caches image responses not only for `avatars`, but also for `speakers` and `exhibitors`, reducing repeat fetches on the same device

15. **Admin can now issue attendee QR replacements / fallback access**
   - historical migration `20260409024500_add_qr_login_code_to_profiles.sql` introduced `qr_login_code`, but the current flow no longer depends on storing QR codes in `profiles`
   - new cleanup migration added locally: `20260409031500_stop_persisting_attendee_qr_codes.sql`
   - `LoginView.tsx` no longer persists `qr_login_code`; it now accepts temporary QR payloads that may include `loginEmail` for existing attendee recovery
   - login recovery was hardened so missing QR fields no longer overwrite existing attendee contact info with nulls
   - `manage-users` now supports:
     - `CREATE_ATTENDEE_QR` to create an attendee account and immediately prepare a temporary QR login
     - `PREPARE_ATTENDEE_QR` to re-enable QR access for any existing attendee without saving a QR code in their profile
   - `AdminView.tsx` now includes:
     - a new `Alta de Asistente con QR` modal
     - a generated QR modal after creation
     - a `QR` button for every attendee row, so the admin can regenerate a temporary QR on demand when the attendee needs to reconnect

### 🧪 Verification Snapshot (2026-04-09)

- `manage-users` now receives POST requests from the admin UI
- deleting the sample exhibitor account / linked exhibitor user was verified working after:
  - redeploying the updated Edge Function
  - running the updated frontend bundle
- remote foreign keys now reflect the intended delete semantics:
  - `public.news_posts.author_id -> public.profiles.id` = `ON DELETE SET NULL`
  - `public.profiles.id -> auth.users.id` = `ON DELETE CASCADE`
- remote `profiles_role_check` now reflects:
  - `admin`
  - `exhibitor`
  - `attendee`
  - `speaker`
- remote `profiles.attendee_category` now exists with check constraint coverage for:
  - `general`
  - `vip`
  - `juez`
- the admin account-creation modal now supports manual attendee onboarding with attendee category selection
- `session_speakers` was verified to already have:
  - `FOREIGN KEY (session_id) REFERENCES agenda_sessions(id) ON DELETE CASCADE`
  - `FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE CASCADE`
- repository search no longer finds direct privileged writes in the UI for:
  - `news_posts` insert/delete
  - `profiles` device reset updates from the admin panel
  - `speakers` create/update/delete
  - `agenda_sessions` create/update/delete
  - `session_speakers` bridge-table writes
- `npm run build` passed after the admin-flow changes, the exhibitor/category boundary work, the speaker/session boundary work, and the news/device-reset boundary work

### ▶️ Next Recommended Step

The highest-value next step is to **operationalize and harden the new backend boundary**:

1. Add a short deployment runbook:
   - redeploy `manage-users`
   - deploy frontend bundle
   - clear stale SW cache once after structural admin-panel updates
2. Decide whether to fold speaker-linked account creation into the same privileged boundary if transactional behavior is important.
3. Review the final remaining Supabase security TODO:
   - enable leaked password protection in Supabase Auth

---

## 🔄 Previous Update (2026-04-08)

### ✅ Changes Applied In Current Working Tree

1. **HMAC secret moved to environment variables**
   - `utils/security.ts` no longer uses a hardcoded secret
   - Added `VITE_HMAC_SECRET` support

2. **Device ID standardized**
   - `App.tsx` and `AuthContext.tsx` now use a shared `cismm_device_id`
   - Added `utils/device.ts` as the single source of truth

3. **Realtime subscription cleanup hardened**
   - Added guards and safer cleanup flow in `hooks/useAppData.ts`
   - Build verified after change

4. **QR tokens upgraded**
   - `ProfileView.tsx` now emits signed QR tokens again
   - `utils/security.ts` now supports **encrypted + signed QR tokens (v2)**
   - Legacy signed tokens remain readable for backward compatibility
   - Added `utils/qr.ts` to centralize QR parsing for login and scanner flows

5. **Environment setup aligned**
   - Added `.env.example`
   - Added `VITE_ENCRYPTION_KEY` support for QR token encryption
   - Local development environment was updated to include current QR security vars

6. **Supabase MCP prepared for this project**
   - Global Codex MCP config was updated to point to project ref `oiuczdclehkiouqgmvsh`
   - MCP now uses bearer-token configuration for **CISMM X CONNECT**

### ⚠️ Important Findings Discovered During Remediation

- The previous documentation understated the runtime gap: `ProfileView.tsx` had been generating plain JSON QR codes in practice, not secure tokens. This is now corrected in the working tree.
- Current QR encryption is still **client-side**, because `VITE_ENCRYPTION_KEY` is exposed to the browser bundle. This improves privacy against casual inspection, but it is **not a full server-side security boundary**.
- Several markdown files now lag the real implementation state. `HANDOFF.md` is the only document updated in this pass for restart continuity.

### ▶️ First Action After Restart

1. Restart Codex / the IDE session so the updated Supabase MCP config is reloaded
2. Re-open this project
3. Use the Supabase MCP against **CISMM X CONNECT** to inspect:
   - tables and views
   - RLS policies
   - storage buckets
   - edge functions
4. Continue with the next security block:
   - move QR issuance / verification server-side or to an Edge Function
   - input validation and sanitization
   - documentation refresh for the remaining markdown files

### 🧪 Supabase MCP Review Snapshot (2026-04-08, post-restart)

Verified via MCP / SQL:

- Migration `harden_public_access` was applied successfully to the remote Supabase project during this review pass
- `avatars` storage bucket exists and is public; there are currently 2 objects in `storage.objects`
- Public schema data is only partially seeded right now:
  - `profiles`: 3 rows (`admin`: 1, `attendee`: 1, `exhibitor`: 1)
  - `exhibitor_categories`: 4 rows
  - `exhibitors`: 1 row
  - `news_posts`: 1 row
  - `agenda_sessions`, `speakers`, `session_speakers`, `session_ratings`, `user_agenda`, `user_session_checkins`, `user_visited_exhibitors`: 0 rows

Critical findings:

1. **Public tables still exposed without effective RLS**
   - This was fixed in the remote project during this pass
   - `agenda_sessions`, `exhibitor_categories`, `exhibitors`, `news_posts`, `session_speakers`, and `speakers` now have `RLS` enabled
   - Admin mutation policies were added for the content-management tables
   - `user_session_checkins` and `user_visited_exhibitors` also gained the missing authenticated insert policies

2. **Broad API grants are still present**
   - This was reduced significantly in the remote project during this pass
   - Public tables now expose `SELECT` to `anon` / `authenticated`, while mutations are limited to `authenticated` and gated by `RLS`
   - `get_peak_activity_hours()` now only grants `EXECUTE` to `authenticated`

3. **Analytics endpoints are exposed beyond admin scope**
   - This was partially fixed in the remote project during this pass
   - Views `top_sessions` and `top_exhibitors` were changed to `security_invoker=true`
   - RPC `get_peak_activity_hours()` now uses `set search_path = ''`, reads from `user_contacts_log`, and throws for non-admin callers
   - The remaining gap is that authenticated non-admin users still have `SELECT` on the two analytics views, though with `security_invoker` they no longer inherit unrestricted creator privileges

4. **Edge Function deployment is not reproducible from the repo yet**
   - This was improved locally during this pass
   - Source is now mirrored at `supabase/functions/manage-users/index.ts`
   - Attempting `npx supabase functions list --project-ref oiuczdclehkiouqgmvsh` still returned `403`, so deployed function inventory could not be fully verified from current access
   - Attempting `npx supabase functions deploy manage-users --project-ref oiuczdclehkiouqgmvsh` also returned `403`
   - Deployment of the versioned function source is still pending access to the required Supabase project privileges

Immediate next actions from this review:

1. Deploy the versioned `manage-users` source from `supabase/functions/manage-users`
2. Move the remaining privileged admin mutations behind Edge Functions or another server-side boundary
3. Tighten analytics further if admin-only visibility is required for `top_sessions` / `top_exhibitors`
4. Export the live Supabase state back into the repo:
   - SQL migrations for current schema / policies
   - A short deployment note for permissions needed to inspect functions
5. Review remaining Auth security setting:
   - Enable leaked password protection in Supabase Auth

---

## 🏗️ Project Architecture

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | React | 19.2.0 |
| **Language** | TypeScript | 5.8.2 |
| **Build Tool** | Vite | 6.2.0 |
| **CSS Framework** | Tailwind CSS | 3.4.17 |
| **Database/Auth** | Supabase | 2.98.0 |
| **QR Scanning** | html5-qrcode | 2.3.8 |
| **PDF Generation** | jsPDF | 2.5.1 |
| **Image Compression** | browser-image-compression | 2.0.2 |

### Project Structure

```
cismm-x-connect/
├── components/
│   ├── common/              # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── BottomNav.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── GlassCard.tsx
│   │   ├── Modal.tsx
│   │   ├── NewsCard.tsx
│   │   ├── NewsForm.tsx
│   │   └── ToastContainer.tsx
│   ├── views/               # Page-level components (lazy-loaded)
│   │   ├── DashboardView.tsx
│   │   ├── AgendaView.tsx
│   │   ├── SpeakersView.tsx
│   │   ├── ExhibitorsView.tsx
│   │   ├── ScannerView.tsx
│   │   ├── ProfileView.tsx
│   │   ├── GamificationView.tsx
│   │   ├── AdminView.tsx
│   │   ├── ExhibitorDashboard.tsx
│   │   ├── NewsBoard.tsx
│   │   ├── InfoView.tsx
│   │   └── LoginView.tsx
│   ├── Icons.tsx
│   └── ToastContainer.tsx
├── contexts/                # React Context API
│   ├── AuthContext.tsx      # Authentication & profiles
│   └── ToastContext.tsx     # Toast notifications
├── hooks/
│   └── useAppData.ts        # Data fetching + realtime subscriptions
├── utils/
│   ├── supabase.ts          # Supabase client init
│   ├── security.ts          # Token generation, signing & QR encryption
│   ├── timeValidation.ts    # Session time validation
│   └── vcardParser.ts       # vCard parsing
├── types.ts                 # TypeScript interfaces
├── constants.ts             # App constants
├── App.tsx                  # Main app component (routing, lazy loading)
├── index.tsx                # React DOM render entry
├── index.css                # Global styles + Tailwind
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
├── tailwind.config.js       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── package.json
├── CORRECTIONS.md           # Previous fixes documentation
└── public/
    ├── sw.js                # Service Worker (PWA)
    ├── manifest.json        # PWA manifest
    ├── icons/               # PWA icons
    └── index.html
```

---

## 🔐 Current State Analysis

> Note: the audit snapshot below reflects the original handoff analysis. See **Recent Update (2026-04-08)** above for the latest implementation status in the working tree.

### ✅ What's Working Well

1. **React Hook Management** - Recently fixed (commit 94bfbd6), all hooks run before conditional returns
2. **Error Boundary** - Proper crash recovery implemented (commit 8c9539c)
3. **PWA Implementation** - Service worker and offline-first caching
4. **Lazy Loading Views** - All page views lazy-loaded with automatic retry on chunk errors
5. **Realtime Updates** - News posts and agenda sessions update in real-time via Supabase
6. **Optimistic UI** - Agenda items and exhibitor visits update immediately with DB sync
7. **Device Binding Security** - Device ID tracking for account security
8. **Database Persistence** - Contacts now stored in DB (not localStorage)

### 🔴 Critical Issues (BLOCKING PRODUCTION)

#### Issue #1: Hardcoded HMAC Secret Key
**File**: `utils/security.ts:2`  
**Severity**: 🔴 CRITICAL  
**Risk Level**: HIGH  

```typescript
const SECRET_KEY = 'CISMM_CONNECT_SECURE_KEY_2025';
```

**Impact**:
- Anyone can forge QR codes with valid signatures
- Allows QR spoofing and fraudulent attendee registration
- Security token can be replayed

**Required Fix**:
```typescript
const SECRET_KEY = import.meta.env.VITE_HMAC_SECRET || '';
if (!SECRET_KEY) throw new Error('Missing VITE_HMAC_SECRET');
```

**Blockers**: 
- [ ] Add env variable to `.env.local`
- [ ] Update CI/CD to pass secret
- [ ] Rotate secret key

---

#### Issue #2: Duplicate Device ID Initialization
**Files**: `App.tsx:86-93` vs `AuthContext.tsx:30-37`  
**Severity**: 🔴 CRITICAL  
**Risk Level**: MEDIUM  

Two different localStorage keys:
```typescript
// App.tsx
localStorage.getItem('device_id')

// AuthContext.tsx  
localStorage.getItem('cismm_device_id')
```

**Impact**:
- User appears as 2 different devices
- Device limit enforcement breaks
- Can bypass device restrictions

**Required Fix**: Standardize to `cismm_device_id` everywhere

---

#### Issue #3: Memory Leak in Realtime Subscriptions
**File**: `hooks/useAppData.ts:103-184`  
**Severity**: 🔴 CRITICAL  
**Risk Level**: MEDIUM  

```typescript
useEffect(() => {
    // Subscriptions created but cleanup may not work properly
    let cleanupSubscriptions: (() => void) | undefined;
    
    const init = async () => {
        // ...
        cleanupSubscriptions = setupRealtimeSubscriptions();
    };
    
    return () => {
        if (cleanupSubscriptions) cleanupSubscriptions();
    };
}, [userId]);
```

**Impact**:
- Browser memory leaks on repeated view changes
- Multiple subscriptions accumulate
- Performance degradation over time

**Required Fix**: Ensure cleanup runs even if subscription fails

---

### 🟡 Important Issues

| # | Issue | File | Severity | Impact |
|---|-------|------|----------|--------|
| 4 | Typo "anucio" | App.tsx:302 | LOW | Text bug |
| 5 | Missing form validation | App.tsx:287-304 | MEDIUM | Empty posts accepted |
| 6 | Excessive `any` types | Multiple | MEDIUM | Type safety lost |
| 7 | Inconsistent error handling | Multiple | MEDIUM | Poor UX on failures |
| 8 | QR payload not encrypted | utils/security.ts | HIGH | Information disclosure |
| 9 | Device limit bypass for admins | AuthContext.tsx:56-68 | MEDIUM | Logic flaw |
| 10 | No input sanitization | Multiple forms | MEDIUM | XSS potential |

---

## 📊 Code Quality Metrics

```
Language Distribution:
- TypeScript/TSX: ~2,500 lines
- CSS (Tailwind): ~800 lines
- Config: ~200 lines

Complexity:
- Cyclomatic Complexity: MEDIUM (views are dense)
- Nesting Depth: 3-4 levels (acceptable)
- Test Coverage: 0% (no tests present)

Type Safety:
- `any` usage: ~15 instances (should be <5)
- Strict null checks: Enabled but not enforced everywhere
```

---

## 🚀 User Flows

### 1. **Attendee Login Flow**
```
Start
  ↓
[Scanner/Username Login]
  ↓
[Supabase Auth]
  ↓
[Fetch Profile + Device Binding Check]
  ↓
[Load Dashboard]
```

### 2. **QR Scanning Flow (Contact Network)**
```
ScannerView
  ↓
[Decode QR → Parse vCard/Secure Token]
  ↓
[Verify signature (if secured)]
  ↓
[Check device binding]
  ↓
[Insert to user_contacts_log]
  ↓
[Refresh contacts from DB with photos]
  ↓
[Show success toast + points awarded]
```

### 3. **Agenda Management**
```
AgendaView
  ↓
[Show all sessions with user's saved items]
  ↓
[Add/Remove from agenda]
  ↓
[Insert/Delete to user_agenda]
  ↓
[Award/Remove points]
  ↓
[Realtime subscription updates display]
```

### 4. **Gamification**
```
Every Action (scan, agenda, checkin, rating)
  ↓
[Award Points]
  ↓
[Update profile.points in DB]
  ↓
[Fetch leaderboard (top 10 attendees)]
  ↓
[Display rank + points]
```

---

## 📱 Key Features

### Implemented ✅
- User Authentication (Supabase)
- QR Code Scanner
- vCard parsing
- Secure token generation/verification
- Agenda management with check-ins
- Exhibitor tracking
- Contact networking
- Gamification (points/leaderboard)
- Admin dashboard
- News/Announcements
- PWA offline support
- Realtime notifications
- Error boundaries
- Device binding

### In Progress 🟡
- Production security audit
- QR payload encryption

### Not Implemented ❌
- Unit tests
- E2E tests
- Analytics
- Push notifications
- Offline sync queue
- Multi-language support

---

## 🔑 Environment Variables

**Required for Development**:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_HMAC_SECRET=your-secure-secret-key-here
VITE_GEMINI_API_KEY=ai...  # For future AI features
```

**Database Setup**: Already configured (provided via Supabase project)

---

## 📊 Database Schema (Supabase)

### Core Tables

**profiles**
```sql
- id (uuid, primary key)
- name (text)
- email (text)
- phone (text)
- title (text)
- company (text)
- photo_url (text)
- role (enum: admin, exhibitor, attendee)
- track (enum: Medicina Estética, Spa, PMU, General)
- points (integer, default: 0)
- interests (text array)
- exhibitor_id (integer, FK to exhibitors)
- device_id (text)
- registered_devices (text array) [NEW: multi-device tracking]
- max_devices (integer, default: 1)
```

**user_agenda**
```sql
- id (uuid, primary key)
- user_id (uuid, FK to profiles)
- session_id (integer, FK to agenda_sessions)
- created_at (timestamp)
```

**user_visited_exhibitors**
```sql
- id (uuid, primary key)
- user_id (uuid, FK to profiles)
- exhibitor_id (integer, FK to exhibitors)
- visited_at (timestamp)
```

**user_session_checkins**
```sql
- id (uuid, primary key)
- user_id (uuid, FK to profiles)
- session_id (integer, FK to agenda_sessions)
- checked_in_at (timestamp)
```

**session_ratings**
```sql
- id (uuid, primary key)
- user_id (uuid, FK to profiles)
- session_id (integer, FK to agenda_sessions)
- rating (integer, 1-5)
- comment (text)
- created_at (timestamp)
```

**user_contacts_log** [NEW]
```sql
- id (uuid, primary key)
- user_id (uuid, FK to profiles)
- contact_id (uuid, FK to profiles)
- connected_at (timestamp)
```

**news_posts** [NEW]
```sql
- id (integer, primary key)
- title (text)
- content (text)
- author_name (text)
- author_role (enum: admin, exhibitor)
- category (enum: promotion, announcement, alert, general)
- created_at (timestamp)
```

**agenda_sessions**
```sql
- id (integer)
- title (text)
- description (text)
- start_time (time)
- end_time (time)
- room (text)
- day (enum: Viernes, Sábado, Domingo)
- track (enum: ...)
```

**speakers, exhibitors, exhibitor_categories**: Pre-configured

---

## 🔄 Release History

| Commit | Date | Changes |
|--------|------|---------|
| 4f2ba31 | Now | Lazy load retry for chunk errors |
| 407814a | Now | Database-driven contacts + photos |
| a8da54c | Now | Admin device management |
| 8c9539c | Now | ErrorBoundary + speaker.social fix |
| 94bfbd6 | Now | Hook execution order fix |
| d1c1d8b | Recent | React hooks isolation |
| 9453e0e | Recent | Mobile hook crash fix |

See `git log` for full history (20+ commits)

---

## 🎯 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Build Time | ~5s | <5s ✅ |
| Page Load | ~2s | <3s ✅ |
| Bundle Size | ~450KB | <400KB ⚠️ |
| Lighthouse Score | ~75 | >85 ❌ |
| Test Coverage | 0% | >60% ❌ |
| Critical Bugs | 3 | 0 ❌ |

---

## 📞 Key Contacts & Resources

- **Database**: Supabase Dashboard (via project URL)
- **Deployment**: Netlify (configured in `netlify.toml`)
- **Version Control**: Git (GitHub implied)

---

## 📋 Next Document: See PROJECT_STATUS.md for detailed status

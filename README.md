# WEB-04 Challenge — Role-Gated Admin Dashboard

A minimal admin dashboard demonstrating role-based access control with Supabase Auth and Row Level Security (RLS).

## Submitted for: WEB-04 · Role-gated admin dashboard slice

## Overview

The application has three roles — `admin`, `judge`, and `viewer`. Each role has different visibility into the applications table:

| Role     | Access                                       |
| -------- | -------------------------------------------- |
| `admin`  | Full access — sees all PII (email, phone)    |
| `judge`  | Full access — same as admin                  |
| `viewer` | Redacted access — email and phone are masked |

**Success criteria met:**

- ✅ Three roles demonstrated with separate views
- ✅ RLS (Row Level Security) enforces access at the database level
- ✅ Client-side tampering (DevTools) cannot bypass the restrictions
- ✅ Failed escalation attempt is documented

---

## Architecture

**Frontend**

- React (Vite)
- Tailwind CSS
- React Router
- Supabase JS client

**Backend**

- Supabase Auth (email/password)
- Supabase Postgres

**Security Model**

- Row Level Security enabled on all tables
- Role-aware database views for redacted data
- No secret keys exposed to the frontend — only the publishable key

---

## 🔐 Database Schema

| Object                  | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `profiles`              | Stores user role (`admin` / `judge` / `viewer`) — linked to `auth.users` |
| `applications`          | Stores application data including PII (email, phone)                     |
| `applications_redacted` | A view that returns masked PII for viewers only                          |

Full SQL — tables, functions, triggers, RLS policies, and demo data — is in [`schema.sql`](./schema.sql).

### Key RLS Policies

**Applications table — only admin and judge can read full data:**

```sql
CREATE POLICY "Admins and judges view full applications"
ON public.applications FOR SELECT
TO authenticated
USING (public.is_admin_or_judge());
```

**Profiles table — only admins can update roles:**

```sql
CREATE POLICY "Only admins can update roles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');
```

**Redacted view — viewers get masked email and phone:**

The `applications_redacted` view applies `regexp_replace()` on email and phone before returning rows, and only returns data when the caller's role is `viewer`.

---

## Test Credentials

These are demo-only credentials. Do **not** reuse in production.

| Role   | Email             | Password    |
| ------ | ----------------- | ----------- |
| Admin  | `admin@test.com`  | `admin123`  |
| Judge  | `judge@test.com`  | `judge123`  |
| Viewer | `viewer@test.com` | `viewer123` |

---

## Privilege Escalation Proof

As a `viewer`, I attempted three attack vectors from the browser DevTools console. **All three failed.**

### Attempt 1 — Direct full-table access

```js
const { data: fullData, error: fullError } = await window.supabase
  .from("applications")
  .select("*");
console.log("Attempt 1 — full:", fullData, "| Error:", fullError);
```

**Result:** Empty array. RLS blocked the query — the viewer cannot read the full applications table.

### Attempt 2 — Redacted view access

```js
const { data: redactedData, error: redactedError } = await window.supabase
  .from("applications_redacted")
  .select("*");
console.log("Attempt 2 — redacted:", redactedData);
```

**Result:** Only redacted rows returned — `ka***@example.com`, `0171****`. The viewer can only see masked PII.

### Attempt 3 — Self role escalation

```js
const uid = (await window.supabase.auth.getUser()).data.user.id;
const { error: escError } = await window.supabase
  .from("profiles")
  .update({ role: "admin" })
  .eq("id", uid);
console.log("Attempt 3 — escalation:", escError);
```

**Result:** The query executed, but **zero rows** were updated. The RLS policy silently blocked the write.

### Verification — role remains `viewer`

```js
const uid = (await window.supabase.auth.getUser()).data.user.id;
const { data: profile } = await window.supabase
  .from("profiles")
  .select("role")
  .eq("id", uid)
  .single();
console.log("Role after escalation attempt:", profile.role);
```

**Conclusion:** Even with full control of the browser DevTools, the viewer cannot read PII or escalate their role. Security is enforced at the database level, not in the frontend.

### Lesson Learned

Initially, the `profiles` table had no UPDATE policy. The escalation attempt returned `error: null` but with **0 rows updated** — silent denial. To make this explicit and future-proof, I added the `"Only admins can update roles"` policy. This ensures any unauthorized update returns a clear RLS error rather than failing silently.

---

## Screenshots

All screenshots are stored in the `docs/` folder:

| File                                   | Description                                      |
| -------------------------------------- | ------------------------------------------------ |
| `docs/admin-view.png`                  | Admin logged in — full data, red badge           |
| `docs/judge-view.png`                  | Judge logged in — full data, blue badge          |
| `docs/viewer-view.png`                 | Viewer logged in — redacted data, yellow warning |
| `docs/escalation-1-full-blocked.png`   | Attempt 1: full table blocked                    |
| `docs/escalation-2-redacted-only.png`  | Attempt 2: redacted data only                    |
| `docs/escalation-3-role-unchanged.png` | Attempt 3: role still `viewer`                   |

---

## Walkthrough Video

Link: https://drive.google.com/file/d/1ggfmOYe73WCdphHJPCNW4bacOb8g_20F/view?usp=drive_link

### Live Host
Link: https://web-04-role-based-dashboard.netlify.app
---

## Setup (Local)

```bash
npm install
npm run dev
```

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://madnhxcbqhtabjbgujjg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_GDyM3tbd-EY-V1iR_s8FRw_yudkCFGR

```

---

## Project Structure

```
role-admin-dashboard/
├── src/
│   ├── components/ProtectedRoute.jsx
│   ├── context/AuthContext.jsx
│   ├── lib/supabase.js
│   ├── pages/Login.jsx
│   ├── pages/Dashboard.jsx
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── docs/               (screenshots)
├── schema.sql          (full SQL)
├── credentials.txt     (test logins)
├── .env.example
└── README.md
```

---

## Security Notes

- **No secret keys in the frontend** — only the publishable key is used in the browser.
- **Roles are stored in a database table** (`profiles`), not in user metadata (which could be tampered with).
- **PII redaction happens in a database view**, not in the frontend — the API itself returns masked data.
- **Frontend route guards are UX only** — the actual security boundary is RLS.

---

## Conclusion

This project proves that authorization must live at the database layer. Even with DevTools open and full API access, the viewer cannot read PII or escalate their role.

---

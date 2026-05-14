# Consolidate KYC Approval Paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the duplicate KYC approval paths by introducing a single atomic `review_kyc_submission` RPC and removing the stale admin-level endpoints.

**Architecture:** All KYC review actions flow through one RPC that holds a `FOR UPDATE` lock on the submission row, guards against double-processing, and atomically updates both `kyc_submissions` and `users` in a single transaction. The admin list endpoint moves from `admin.js` to `kyc.js` and now returns submission rows (with nested user data) instead of raw user rows. Because `admin.js` will be left completely empty of routes after this change, it is removed entirely.

**Tech Stack:** Node.js/Express backend, Supabase PostgreSQL (SECURITY DEFINER RPC), React 18 + TypeScript frontend.

---

## Files Changed

| Action | Path |
|--------|------|
| **Create** | `supabase/migrations/009_consolidate_kyc_approval.sql` |
| **Modify** | `backend/routes/kyc.js` |
| **Delete** | `backend/routes/admin.js` |
| **Modify** | `backend/server.js` |
| **Modify** | `frontend/src/pages/AdminPanel.tsx` |
| **Modify** | `docs/PROJECT_OVERVIEW.md` |

---

## Task 1: Write the SQL Migration

**Files:**
- Create: `supabase/migrations/009_consolidate_kyc_approval.sql`

### RPC design

The function takes `(p_submission_id, p_admin_id, p_action, p_reason)`.

Execution order inside one transaction:
1. Validate `p_action` is `'approve'` or `'reject'`
2. Validate `p_reason` is non-empty when `p_action = 'reject'`
3. `SELECT ... FOR UPDATE` on `kyc_submissions` — this serialises concurrent admin clicks on the same submission
4. Guard: return error JSONB if `status != 'pending'` (prevents double-processing)
5. `UPDATE kyc_submissions` — set `status`, `reviewed_at`, `reviewed_by`, `rejection_reason`
6. `UPDATE users` — set `kyc_status` and `kyc_rejection_reason`
7. Return JSONB with `{ok, submission_id, user_id, action, kyc_status}`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/009_consolidate_kyc_approval.sql
-- Atomic KYC review RPC that replaces the dual-path approval in admin.js and kyc.js.
-- Run after 008_soft_delete.sql.

CREATE OR REPLACE FUNCTION public.review_kyc_submission(
  p_submission_id  uuid,
  p_admin_id       uuid,
  p_action         text,
  p_reason         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub     record;
  v_new_kyc text;
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'action must be ''approve'' or ''reject''');
  END IF;

  IF p_action = 'reject' AND (p_reason IS NULL OR TRIM(p_reason) = '') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rejection reason required');
  END IF;

  SELECT * INTO v_sub
  FROM public.kyc_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Submission not found');
  END IF;

  IF v_sub.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Submission is not pending — current status: ' || v_sub.status
    );
  END IF;

  v_new_kyc := CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END;

  UPDATE public.kyc_submissions
  SET
    status           = v_new_kyc,
    reviewed_at      = now(),
    reviewed_by      = p_admin_id,
    rejection_reason = CASE WHEN p_action = 'reject' THEN p_reason ELSE NULL END
  WHERE id = p_submission_id;

  UPDATE public.users
  SET
    kyc_status           = v_new_kyc,
    kyc_rejection_reason = CASE WHEN p_action = 'reject' THEN p_reason ELSE NULL END
  WHERE id = v_sub.user_id;

  RETURN jsonb_build_object(
    'ok',            true,
    'submission_id', p_submission_id,
    'user_id',       v_sub.user_id,
    'action',        p_action,
    'kyc_status',    v_new_kyc
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_kyc_submission(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_kyc_submission(uuid, uuid, text, text) TO service_role;
```

- [ ] **Step 2: Run the migration in Supabase SQL editor and verify**

Paste the file content into the Supabase Dashboard → SQL Editor and execute. Confirm no errors.

Then smoke-test the RPC directly (replace UUIDs with real values):
```sql
-- Should return {ok: false, error: "Submission not found"}
SELECT public.review_kyc_submission(
  gen_random_uuid(), gen_random_uuid(), 'approve'
);

-- Should return {ok: false, error: "Rejection reason required"}
SELECT public.review_kyc_submission(
  gen_random_uuid(), gen_random_uuid(), 'reject', ''
);

-- Should return {ok: false, error: "action must be 'approve' or 'reject'"}
SELECT public.review_kyc_submission(
  gen_random_uuid(), gen_random_uuid(), 'banana'
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_consolidate_kyc_approval.sql
git commit -m "feat: add review_kyc_submission RPC for atomic KYC approval"
```

---

## Task 2: Rewrite `backend/routes/kyc.js`

**Files:**
- Modify: `backend/routes/kyc.js`

Changes:
1. Add `requireAdmin` and `evaluateRewards` imports (both previously missing)
2. Add `GET /admin/pending` route at the **top** (before any `/:id` patterns) — returns `kyc_submissions` rows with nested `user` object
3. Replace inline `POST /:id/approve` body with RPC call + `evaluateRewards`
4. Replace inline `POST /:id/reject` body with RPC call
5. Remove the inline `req.user.role !== 'admin'` guards — replaced by `requireAdmin` middleware

- [ ] **Step 1: Replace the full file**

```js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { supabase } from '../supabase/client.js';
import { verifyToken, requireAdmin } from '../middleware/verifyToken.js';
import { evaluateRewards } from '../services/rewardsEngine.js';

const router = Router();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, or PDF files are allowed'));
  },
});

const uploadFields = upload.fields([
  { name: 'national_id_front', maxCount: 1 },
  { name: 'national_id_back',  maxCount: 1 },
  { name: 'selfie',            maxCount: 1 },
  { name: 'address_proof',     maxCount: 1 },
]);

async function uploadToStorage(userId, fieldName, file) {
  const ext = path.extname(file.originalname) || '.jpg';
  const storagePath = `${userId}/${fieldName}_${Date.now()}${ext}`;
  const { error } = await supabase.storage
    .from('kyc-documents')
    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw new Error(`Storage upload failed for ${fieldName}: ${error.message}`);
  return storagePath;
}

// GET /api/kyc/admin/pending — admin: list submissions awaiting review
// Must be defined before /:id routes to avoid Express treating 'admin' as an id param.
router.get('/admin/pending', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select(`
        id, status, submitted_at, rejection_reason,
        national_id_front_url, national_id_back_url, selfie_url, address_proof_url,
        users!inner(id, email, full_name, phone, kyc_status, created_at)
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (error) throw error;

    const submissions = (data || []).map((s) => ({
      id: s.id,
      status: s.status,
      submitted_at: s.submitted_at,
      rejection_reason: s.rejection_reason,
      national_id_front_url: s.national_id_front_url,
      national_id_back_url: s.national_id_back_url,
      selfie_url: s.selfie_url,
      address_proof_url: s.address_proof_url,
      user: s.users,
    }));

    return res.json({ submissions });
  } catch (e) {
    console.error('kyc admin/pending', e);
    return res.status(500).json({ error: 'Failed to load KYC queue' });
  }
});

// POST /api/kyc/submit
router.post('/submit', verifyToken, (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    try {
      const files = req.files || {};
      for (const field of ['national_id_front', 'national_id_back', 'selfie']) {
        if (!files[field]?.[0]) {
          return res.status(400).json({ error: `${field} is required` });
        }
      }

      const [frontPath, backPath, selfiePath] = await Promise.all([
        uploadToStorage(req.user.id, 'national_id_front', files.national_id_front[0]),
        uploadToStorage(req.user.id, 'national_id_back',  files.national_id_back[0]),
        uploadToStorage(req.user.id, 'selfie',            files.selfie[0]),
      ]);

      let addressPath = null;
      if (files.address_proof?.[0]) {
        addressPath = await uploadToStorage(req.user.id, 'address_proof', files.address_proof[0]);
      }

      const { data: submission, error: subErr } = await supabase
        .from('kyc_submissions')
        .insert({
          user_id:               req.user.id,
          national_id_front_url: frontPath,
          national_id_back_url:  backPath,
          selfie_url:            selfiePath,
          address_proof_url:     addressPath,
          status:                'pending',
        })
        .select('id')
        .single();
      if (subErr) throw subErr;

      const { error: uErr } = await supabase
        .from('users')
        .update({ kyc_status: 'pending' })
        .eq('id', req.user.id);
      if (uErr) throw uErr;

      return res.status(201).json({ ok: true, submission_id: submission.id });
    } catch (e) {
      console.error('kyc submit', e);
      return res.status(500).json({ error: 'Submission failed' });
    }
  });
});

// GET /api/kyc/status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('kyc_status, kyc_rejection_reason')
      .eq('id', req.user.id)
      .single();
    if (uErr || !user) return res.status(404).json({ error: 'User not found' });

    const { data: latest } = await supabase
      .from('kyc_submissions')
      .select('id, status, submitted_at, rejection_reason')
      .eq('user_id', req.user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.json({
      kyc_status: user.kyc_status,
      kyc_rejection_reason: user.kyc_rejection_reason || null,
      latest_submission: latest || null,
    });
  } catch (e) {
    console.error('kyc status', e);
    return res.status(500).json({ error: 'Failed to load KYC status' });
  }
});

// POST /api/kyc/:id/approve — admin only
router.post('/:id/approve', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('review_kyc_submission', {
      p_submission_id: req.params.id,
      p_admin_id:      req.user.id,
      p_action:        'approve',
    });

    if (error) {
      console.error('review_kyc_submission rpc', error);
      return res.status(500).json({ error: error.message || 'Approval failed' });
    }
    if (data && data.ok === false) {
      return res.status(400).json({ error: data.error || 'Approval failed' });
    }

    await evaluateRewards(data.user_id);

    return res.json({ ok: true, user_id: data.user_id, kyc_status: data.kyc_status });
  } catch (e) {
    console.error('kyc approve', e);
    return res.status(500).json({ error: 'Approval failed' });
  }
});

// POST /api/kyc/:id/reject — admin only
router.post('/:id/reject', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Rejection reason required' });

    const { data, error } = await supabase.rpc('review_kyc_submission', {
      p_submission_id: req.params.id,
      p_admin_id:      req.user.id,
      p_action:        'reject',
      p_reason:        reason,
    });

    if (error) {
      console.error('review_kyc_submission rpc', error);
      return res.status(500).json({ error: error.message || 'Rejection failed' });
    }
    if (data && data.ok === false) {
      return res.status(400).json({ error: data.error || 'Rejection failed' });
    }

    return res.json({ ok: true, user_id: data.user_id, kyc_status: data.kyc_status });
  } catch (e) {
    console.error('kyc reject', e);
    return res.status(500).json({ error: 'Rejection failed' });
  }
});

export default router;
```

- [ ] **Step 2: Verify the backend starts without errors**

```bash
cd backend && node --watch server.js
# Expected: "INFINDER API listening on 4000" with no import errors
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/kyc.js
git commit -m "feat: consolidate KYC review into review_kyc_submission RPC"
```

---

## Task 3: Remove `admin.js` and Its Server Registration

**Files:**
- Delete: `backend/routes/admin.js`
- Modify: `backend/server.js`

After removing the three KYC routes, `admin.js` is an empty router with no routes — dead code. Remove it entirely.

- [ ] **Step 1: Delete `admin.js`**

Delete the file `backend/routes/admin.js`.

- [ ] **Step 2: Remove the admin import and mount from `server.js`**

In `backend/server.js`, remove these two lines:

```js
// Remove:
import adminRoutes from './routes/admin.js';

// Remove:
app.use('/api/admin', adminRoutes);
```

The full updated `server.js` (only the relevant section shown — do not change anything else):

```js
import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import investmentsRoutes from './routes/investments.js';
import paymentsRoutes from './routes/payments.js';
import learningRoutes from './routes/learning.js';
import rewardsRoutes from './routes/rewards.js';
import assistantRoutes from './routes/assistant.js';
import analyticsRoutes from './routes/analytics.js';
import depositsRoutes from './routes/deposits.js';
import kycRoutes from './routes/kyc.js';

const app = express();
app.set('trust proxy', 1);

const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: [origin, /^http:\/\/localhost:\d+$/, /^https:\/\/.*\.vercel\.app$/],
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/deposits', depositsRoutes);
app.use('/api/kyc', kycRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`INFINDER API listening on ${PORT}`);
  });
}

export default app;
```

- [ ] **Step 3: Restart the backend and confirm no errors**

```bash
node --watch server.js
# Expected: starts cleanly, no "Cannot find module './routes/admin.js'" error
```

- [ ] **Step 4: Confirm old admin endpoints return 404**

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:4000/api/admin/kyc/approve \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"any"}'
# Expected: 404
```

- [ ] **Step 5: Commit**

```bash
git add backend/server.js
git rm backend/routes/admin.js
git commit -m "chore: remove admin.js — KYC review moved to /api/kyc routes"
```

---

## Task 4: Update `AdminPanel.tsx`

**Files:**
- Modify: `frontend/src/pages/AdminPanel.tsx`

The component currently passes user IDs to admin-level endpoints. It must now pass submission IDs to the kyc-level endpoints. The data shape from `GET /api/kyc/admin/pending` is:
```json
{
  "submissions": [
    {
      "id": "<submission-uuid>",
      "status": "pending",
      "submitted_at": "...",
      "user": { "id": "...", "email": "...", "full_name": "...", "phone": "...", "kyc_status": "...", "created_at": "..." }
    }
  ]
}
```

The `Submission` type replaces the old `Row` type. The `approve` and `reject` functions receive the submission ID, not the user ID. Display fields now come from `s.user.*` instead of `u.*`. Everything else (layout, styling, i18n keys, shared reason input) stays unchanged.

- [ ] **Step 1: Replace the full file**

```tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { AppShell } from '../components/AppShell';

type Submission = {
  id: string;
  status: string;
  submitted_at: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    kyc_status: string;
    created_at: string;
  };
};

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const colorMap: Record<string, string> = {
    pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  const color = colorMap[normalized] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Submission[]>([]);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await api.get('/api/kyc/admin/pending');
    setRows(r.data.submissions);
  }

  useEffect(() => {
    load().catch(() => setMsg(t('admin_load_error')));
  }, []);

  async function approve(submissionId: string) {
    setMsg('');
    await api.post(`/api/kyc/${submissionId}/approve`);
    setMsg(t('admin_approved_msg'));
    await load();
  }

  async function reject(submissionId: string) {
    setMsg('');
    await api.post(`/api/kyc/${submissionId}/reject`, {
      reason: reason || 'Please resubmit documents.',
    });
    setMsg(t('admin_rejected_msg'));
    setReason('');
    await load();
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-widest uppercase mb-1">INFINDER</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin_title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t('admin_sub')}</p>
        {msg && <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">{msg}</p>}

        <div className="mt-6 space-y-3">
          {rows.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('admin_none')}</p>
          ) : (
            rows.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{s.user.full_name || '—'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{s.user.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{s.user.phone || t('admin_no_phone')}</p>
                  <div className="mt-2">
                    <StatusBadge status={s.status} />
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2 sm:min-w-[200px]">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => approve(s.id)}
                      className="rounded-full bg-infinder-lime text-infinder-black text-sm font-semibold px-4 py-2"
                    >
                      {t('admin_approve')}
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(s.id)}
                      className="rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium px-4 py-2"
                    >
                      {t('admin_reject')}
                    </button>
                  </div>
                  <div className="w-full">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('admin_reason_placeholder')}</label>
                    <input
                      className="text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      placeholder={t('admin_reason_placeholder')}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Run the TypeScript compiler to confirm no type errors**

```bash
cd frontend && npx tsc --noEmit
# Expected: exits 0 with no errors
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AdminPanel.tsx
git commit -m "feat: update AdminPanel to use consolidated /api/kyc endpoints"
```

---

## Task 5: Update `docs/PROJECT_OVERVIEW.md`

**Files:**
- Modify: `docs/PROJECT_OVERVIEW.md`

Two changes:
1. In **Section 2 (API Endpoints)**, update the KYC table: add the new `GET /api/kyc/admin/pending` row, note that `GET /api/admin/kyc`, `POST /api/admin/kyc/approve`, and `POST /api/admin/kyc/reject` no longer exist.
2. In **Section 7 (Known Issues)**, remove the "Duplicate KYC approval paths" bullet and replace with a brief sentence documenting the refactor.

- [ ] **Step 1: Update the KYC endpoints table in Section 2**

Replace the KYC table block with:

```markdown
### KYC — `/api/kyc`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/submit` | Upload documents (national ID front/back + selfie + optional address proof) |
| GET | `/status` | Return current KYC status and latest submission for the user |
| GET | `/admin/pending` | **Admin** — list `kyc_submissions` with `status='pending'`, each with nested `user` object |
| POST | `/:id/approve` | **Admin** — approve a KYC submission (atomically updates submission + user via RPC) |
| POST | `/:id/reject` | **Admin** — reject a KYC submission with `{ reason }` body (atomically updates both) |
```

Remove the old `### Admin — /api/admin` section entirely (it no longer exists).

- [ ] **Step 2: Update Section 7 (Known Issues)**

Replace the bullet:
```
- **Duplicate KYC approval paths.** KYC can be approved via ...
```

With:
```
- **KYC approval refactored (2026-05-13).** The dual-path approval design
  (`POST /api/kyc/:id/approve` + `POST /api/admin/kyc/approve`) was consolidated
  into a single `review_kyc_submission` Postgres RPC (migration 009). All KYC
  review actions now go through `POST /api/kyc/:id/approve|reject`. The
  `admin.js` route file was removed as it became empty.
```

- [ ] **Step 3: Commit**

```bash
git add docs/PROJECT_OVERVIEW.md
git commit -m "docs: update PROJECT_OVERVIEW to reflect KYC approval consolidation"
```

---

## End-to-End Manual Verification Checklist

Run these after all tasks are committed. You need two accounts: one regular user (`USER_TOKEN`) and one admin (`ADMIN_TOKEN`), and a pending KYC submission (submit one via the app or directly in the DB).

```bash
BASE=http://localhost:4000

# 1. Admin list returns submissions (not user rows)
curl -s "$BASE/api/kyc/admin/pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.submissions[0] | keys'
# Expected: ["address_proof_url","id","national_id_back_url","national_id_front_url","rejection_reason","selfie_url","status","submitted_at","user"]

# 2. Regular user cannot access the admin list
curl -s -o /dev/null -w "%{http_code}" "$BASE/api/kyc/admin/pending" \
  -H "Authorization: Bearer $USER_TOKEN"
# Expected: 403

# 3. Old admin endpoints are gone
curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/kyc/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"userId":"any"}'
# Expected: 404

# 4. Approve a submission — both rows update together
SUBMISSION_ID=<uuid from step 1>
curl -s -X POST "$BASE/api/kyc/$SUBMISSION_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
# Expected: {"ok":true,"user_id":"...","kyc_status":"approved"}
# Verify in DB: kyc_submissions.status='approved' AND users.kyc_status='approved'

# 5. Double-approve returns 400
curl -s -X POST "$BASE/api/kyc/$SUBMISSION_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
# Expected: {"error":"Submission is not pending — current status: approved"}

# 6. Reject requires reason
NEW_SUBMISSION_ID=<uuid of a different pending submission>
curl -s -X POST "$BASE/api/kyc/$NEW_SUBMISSION_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":""}' | jq .
# Expected: {"error":"Rejection reason required"}

# 7. Reject with reason works
curl -s -X POST "$BASE/api/kyc/$NEW_SUBMISSION_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"ID image is blurry"}' | jq .
# Expected: {"ok":true,"user_id":"...","kyc_status":"rejected"}
# Verify in DB: kyc_submissions.rejection_reason='ID image is blurry'
#              AND users.kyc_rejection_reason='ID image is blurry'
```

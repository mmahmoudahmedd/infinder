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
// Defined before /:id routes to prevent Express treating 'admin' as a submission ID param.
router.get('/admin/pending', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { data: subs, error: subErr } = await supabase
      .from('kyc_submissions')
      .select('id, status, submitted_at, rejection_reason, national_id_front_url, national_id_back_url, selfie_url, address_proof_url, user_id')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (subErr) throw subErr;

    const userIds = [...new Set((subs || []).map((s) => s.user_id))];
    let userMap = {};
    if (userIds.length > 0) {
      const { data: users, error: userErr } = await supabase
        .from('users')
        .select('id, email, full_name, phone, kyc_status, created_at')
        .in('id', userIds);
      if (userErr) throw userErr;
      userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));
    }

    const submissions = (subs || []).map((s) => ({
      id: s.id,
      status: s.status,
      submitted_at: s.submitted_at,
      rejection_reason: s.rejection_reason,
      national_id_front_url: s.national_id_front_url,
      national_id_back_url: s.national_id_back_url,
      selfie_url: s.selfie_url,
      address_proof_url: s.address_proof_url,
      user: userMap[s.user_id] || null,
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

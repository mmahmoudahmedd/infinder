import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { supabase } from '../supabase/client.js';
import { verifyToken } from '../middleware/verifyToken.js';

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
router.post('/:id/approve', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { data: sub, error: sErr } = await supabase
      .from('kyc_submissions')
      .update({
        status:      'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: req.user.id,
      })
      .eq('id', req.params.id)
      .select('user_id')
      .single();
    if (sErr || !sub) return res.status(404).json({ error: 'Submission not found' });

    await supabase
      .from('users')
      .update({ kyc_status: 'approved', kyc_rejection_reason: null })
      .eq('id', sub.user_id);

    return res.json({ ok: true });
  } catch (e) {
    console.error('kyc approve', e);
    return res.status(500).json({ error: 'Approval failed' });
  }
});

// POST /api/kyc/:id/reject — admin only
router.post('/:id/reject', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Rejection reason required' });

    const { data: sub, error: sErr } = await supabase
      .from('kyc_submissions')
      .update({
        status:           'rejected',
        reviewed_at:      new Date().toISOString(),
        reviewed_by:      req.user.id,
        rejection_reason: reason,
      })
      .eq('id', req.params.id)
      .select('user_id')
      .single();
    if (sErr || !sub) return res.status(404).json({ error: 'Submission not found' });

    await supabase
      .from('users')
      .update({ kyc_status: 'rejected', kyc_rejection_reason: reason })
      .eq('id', sub.user_id);

    return res.json({ ok: true });
  } catch (e) {
    console.error('kyc reject', e);
    return res.status(500).json({ error: 'Rejection failed' });
  }
});

export default router;

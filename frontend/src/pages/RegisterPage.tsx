import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Upload, X, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { showAlert, showSuccess, showLoading, closeLoading } from '../lib/swal';
import { useTheme } from '../hooks/useTheme';
import WaveCanvas from '../components/canvas/WaveCanvas';
import api from '../lib/api';

type Step = 1 | 2;

type DocFiles = {
  national_id_front: File | null;
  national_id_back: File | null;
  selfie: File | null;
  address_proof: File | null;
};

const DOC_FIELDS: { key: keyof DocFiles; label: string; required: boolean; hint: string }[] = [
  { key: 'national_id_front', label: 'National ID — Front',    required: true,  hint: 'Clear photo of the front side' },
  { key: 'national_id_back',  label: 'National ID — Back',     required: true,  hint: 'Clear photo of the back side' },
  { key: 'selfie',            label: 'Selfie Holding ID',       required: true,  hint: 'Hold your ID next to your face' },
  { key: 'address_proof',     label: 'Address Proof',           required: false, hint: 'Utility bill or bank statement (optional)' },
];

function FileSlot({
  field,
  label,
  hint,
  required,
  file,
  onChange,
}: {
  field: string;
  label: string;
  hint: string;
  required: boolean;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const preview = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  }, [onChange]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {file ? (
        <div className="relative rounded-xl border border-infinder-lime/40 bg-infinder-lime/5 p-3 flex items-center gap-3">
          {preview ? (
            <img src={preview} alt="preview" className="w-12 h-12 object-cover rounded-lg shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
            dragging
              ? 'border-infinder-lime bg-infinder-lime/5'
              : 'border-gray-200 dark:border-white/10 hover:border-infinder-lime/50 dark:hover:border-infinder-lime/30'
          }`}
        >
          <Upload className="w-5 h-5 text-gray-400 dark:text-white/40" />
          <p className="text-xs text-gray-500 dark:text-white/40 text-center">{hint}</p>
          <p className="text-[10px] text-gray-400 dark:text-white/25">JPEG · PNG · PDF · max 5 MB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }}
      />
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const { t } = useTranslation();
  const { dark, toggle } = useTheme();

  const [step, setStep] = useState<Step>(1);
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [sharia_mode, setSharia] = useState(false);
  const [loading, setLoading] = useState(false);

  const [docs, setDocs] = useState<DocFiles>({
    national_id_front: null,
    national_id_back: null,
    selfie: null,
    address_proof: null,
  });

  async function onSubmitAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ email, password, full_name, phone, sharia_mode });
      setStep(2);
    } catch {
      showAlert('Registration failed', t('auth_create_error'));
    } finally {
      setLoading(false);
    }
  }

  async function submitDocuments() {
    for (const f of DOC_FIELDS.filter((d) => d.required)) {
      if (!docs[f.key]) {
        showAlert('Missing document', `Please upload: ${f.label}`);
        return;
      }
    }
    showLoading('Uploading documents…');
    try {
      const fd = new FormData();
      for (const f of DOC_FIELDS) {
        const file = docs[f.key];
        if (file) fd.append(f.key, file);
      }
      await api.post('/api/kyc/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      closeLoading();
      await showSuccess('Documents submitted!', 'Your identity is now under review. You can start exploring while we verify.');
      nav('/onboarding/review', { replace: true });
    } catch (err: unknown) {
      closeLoading();
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showAlert('Upload failed', msg || 'Please try again.');
    }
  }

  function skipKyc() {
    nav('/dashboard', { replace: true });
  }

  const stepLabels = [t('auth_step_personal'), t('auth_step_verification'), t('auth_step_review')];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-infinder-black flex flex-col relative overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none">
        <WaveCanvas isDark={dark} className="w-full h-full" />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-infinder-lime/8 blur-[120px]" />
      </div>

      <div className="relative p-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-infinder-lime text-infinder-black font-bold text-sm">i</span>
          <span className="font-bold tracking-tight text-gray-900 dark:text-white">INFINDER</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
            className="p-1.5 rounded-md text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {step === 1 && (
            <Link to="/login" className="text-sm text-gray-500 dark:text-white/45 hover:text-gray-900 dark:hover:text-white transition">
              {t('auth_have_account')}
            </Link>
          )}
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center px-4 pb-16">
        {step === 1 ? (
          <form
            onSubmit={onSubmitAccount}
            className="w-full max-w-lg bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-8 shadow-sm dark:shadow-none backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 text-xs mb-6">
              <span className="font-semibold text-infinder-lime bg-infinder-lime/10 border border-infinder-lime/25 rounded-full px-3 py-1">
                {stepLabels[0]}
              </span>
              <span className="text-gray-300 dark:text-white/25">—</span>
              <span className="text-gray-400 dark:text-white/30">{stepLabels[1]}</span>
              <span className="text-gray-300 dark:text-white/25">—</span>
              <span className="text-gray-400 dark:text-white/30">{stepLabels[2]}</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth_create_account')}</h1>
            <p className="text-gray-500 dark:text-white/45 text-sm mt-1">{t('auth_create_sub')}</p>

            {([
              { label: t('auth_full_name'), value: full_name, setter: setFullName, type: 'text',     placeholder: 'Your full name' },
              { label: t('auth_email'),     value: email,     setter: setEmail,    type: 'email',    placeholder: 'you@example.com' },
              { label: t('auth_phone'),     value: phone,     setter: setPhone,    type: 'tel',      placeholder: '+20 xxx xxx xxxx' },
              { label: t('auth_password'),  value: password,  setter: setPassword, type: 'password', placeholder: '••••••••', minLength: 6 },
            ] as { label: string; value: string; setter: (v: string) => void; type: string; placeholder: string; minLength?: number }[]).map(({ label, value, setter, type, placeholder, minLength }) => (
              <div key={label} className="mt-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70">{label}</label>
                <input
                  className="mt-1.5 w-full rounded-xl bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-infinder-lime/50 focus:border-infinder-lime/50 transition"
                  placeholder={placeholder}
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  required={type !== 'tel'}
                  minLength={minLength}
                />
              </div>
            ))}

            <label className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-4 cursor-pointer hover:border-infinder-lime/40 dark:hover:border-infinder-lime/25 transition">
              <input
                type="checkbox"
                checked={sharia_mode}
                onChange={(e) => setSharia(e.target.checked)}
                className="mt-0.5 accent-infinder-lime"
              />
              <span>
                <span className="font-medium text-gray-900 dark:text-white block text-sm">{t('auth_enable_sharia')}</span>
                <span className="text-xs text-gray-500 dark:text-white/40 mt-0.5 block">{t('auth_sharia_desc')}</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3.5 text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(190,243,94,0.2)]"
            >
              {loading ? t('auth_creating_account') : t('auth_continue_verification')}
            </button>
          </form>
        ) : (
          <div className="w-full max-w-lg bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-8 shadow-sm dark:shadow-none backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs mb-6">
              <span className="text-gray-400 dark:text-white/30">{stepLabels[0]}</span>
              <span className="text-gray-300 dark:text-white/25">—</span>
              <span className="font-semibold text-infinder-lime bg-infinder-lime/10 border border-infinder-lime/25 rounded-full px-3 py-1">
                {stepLabels[1]}
              </span>
              <span className="text-gray-300 dark:text-white/25">—</span>
              <span className="text-gray-400 dark:text-white/30">{stepLabels[2]}</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Identity</h1>
            <p className="text-gray-500 dark:text-white/45 text-sm mt-1">
              Upload your documents to unlock investing and deposits. All files are encrypted and reviewed by our compliance team.
            </p>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {DOC_FIELDS.map((f) => (
                <FileSlot
                  key={f.key}
                  field={f.key}
                  label={f.label}
                  hint={f.hint}
                  required={f.required}
                  file={docs[f.key]}
                  onChange={(file) => setDocs((prev) => ({ ...prev, [f.key]: file }))}
                />
              ))}
            </div>

            <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/30 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              National ID front, back, and selfie are required. Address proof is optional.
            </div>

            <button
              type="button"
              onClick={submitDocuments}
              className="mt-6 w-full rounded-xl bg-infinder-lime text-infinder-black font-semibold py-3.5 text-sm hover:opacity-90 transition shadow-[0_0_24px_rgba(190,243,94,0.2)]"
            >
              Submit Documents
            </button>

            <button
              type="button"
              onClick={skipKyc}
              className="mt-3 w-full text-sm text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition text-center py-2"
            >
              Skip for now — I'll verify later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { supabase } from '../supabase/client.js';

const BADGE_META = {
  wallet_funded: { title: 'Wallet Funded', description: 'Made your first deposit' },
  first_investment: { title: 'First Investment', description: 'Made your first investment' },
  first_scholar: { title: 'First Scholar', description: 'Completed your first lesson' },
  sharia_investor: { title: 'Sharia Investor', description: 'Used Sharia-aligned preferences' },
  diversified: { title: 'Diversified', description: 'Allocated across multiple asset types' },
  certified_investor: { title: 'Certified Investor', description: 'Completed all learning modules' },
  learning_champion: { title: 'Learning Champion', description: 'Completed 50% of learning modules' },
  verified_investor: { title: 'Verified Investor', description: 'Identity verification approved' },
  portfolio_builder: { title: 'Portfolio Builder', description: 'Invested with a multi-asset allocation' },
  streak_7: { title: '7-Day Streak', description: 'Logged in 7 days in a row' },
};

async function award(userId, badge_key) {
  const meta = BADGE_META[badge_key];
  if (!meta) return;
  const { error } = await supabase.from('achievements').insert({
    user_id: userId,
    badge_key,
    title: meta.title,
    description: meta.description,
  });
  if (error && error.code !== '23505') console.error('award', badge_key, error.message);
}

export async function evaluateRewards(userId) {
  const { data: txs } = await supabase.from('transactions').select('type').eq('user_id', userId);
  const types = new Set((txs || []).map((t) => t.type));
  if (types.has('deposit')) await award(userId, 'wallet_funded');
  if (types.has('investment')) await award(userId, 'first_investment');

  const { data: progress } = await supabase.from('user_progress').select('lesson_id').eq('user_id', userId);
  const doneLessons = new Set((progress || []).map((p) => p.lesson_id));
  if (doneLessons.size >= 1) await award(userId, 'first_scholar');

  const { data: modules } = await supabase.from('learning_modules').select('id');
  const { data: allLessons } = await supabase.from('lessons').select('id, module_id');
  const totalLessons = (allLessons || []).length;
  if (totalLessons > 0 && doneLessons.size >= Math.ceil(totalLessons * 0.5)) {
    await award(userId, 'learning_champion');
  }
  if (totalLessons > 0 && doneLessons.size >= totalLessons) await award(userId, 'certified_investor');

  const { data: user } = await supabase
    .from('users')
    .select('sharia_mode, kyc_status, last_login_at, created_at')
    .eq('id', userId)
    .single();
  if (user?.kyc_status === 'approved') await award(userId, 'verified_investor');
  if (user?.sharia_mode) await award(userId, 'sharia_investor');

  const { data: portfolios } = await supabase.from('portfolios').select('allocation').eq('user_id', userId);
  for (const p of portfolios || []) {
    const a = p.allocation || {};
    const nz = ['stocks', 'baskets', 'bonds', 'gold'].filter((k) => Number(a[k]) > 0).length;
    if (nz >= 3) await award(userId, 'diversified');
    if (nz >= 2) await award(userId, 'portfolio_builder');
  }

  if (user?.last_login_at && user?.created_at) {
    const daysReg = (Date.now() - new Date(user.created_at).getTime()) / 86400000;
    if (daysReg >= 7) await award(userId, 'streak_7');
  }
}

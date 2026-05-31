import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | null;

export function useUserLevel(): { level: UserLevel; loading: boolean } {
  const { user } = useAuth();
  const [level, setLevel] = useState<UserLevel>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setLevel(null); setLoading(false); return; }
    setLoading(true);
    api.get<{ level: UserLevel }>('/api/partners/users/level')
      .then(r => setLevel(r.data.level))
      .catch(() => setLevel(null))
      .finally(() => setLoading(false));
  }, [user]);

  return { level, loading };
}

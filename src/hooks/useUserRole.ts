import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'recruiter';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setRole(null); setLoading(false); return; }
    supabase.from('user_roles').select('role').eq('user_id', user.id).then(({ data }) => {
      if (data && data.length) {
        const roles = data.map(d => d.role as AppRole);
        setRole(roles.includes('admin') ? 'admin' : 'recruiter');
      } else {
        setRole('recruiter');
      }
      setLoading(false);
    });
  }, [user]);

  return { role, loading, isAdmin: role === 'admin' };
}

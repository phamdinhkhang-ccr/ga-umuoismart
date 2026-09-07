import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkgdlmjgabzaglovnfxk.supabase.co';
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabaseServer = createClient(cleanUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

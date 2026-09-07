import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tkgdlmjgabzaglovnfxk.supabase.co';
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabaseClient = createClient(cleanUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

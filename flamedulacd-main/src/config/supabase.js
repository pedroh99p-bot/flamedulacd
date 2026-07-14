const env = import.meta.env ?? {};

export const SUPABASE_PROJECT_REF = env.VITE_SUPABASE_PROJECT_REF || 'gimugfooncsmyztjuull';
export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://gimugfooncsmyztjuull.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_e6EygEl076EgVEzrvO-7Bw__Rc5fDM-';
export const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;

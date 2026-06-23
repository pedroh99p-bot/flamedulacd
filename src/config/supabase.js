const env = import.meta.env ?? {};

export const SUPABASE_PROJECT_REF = env.VITE_SUPABASE_PROJECT_REF || 'dkaajnppslypktcgfeow';
export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://dkaajnppslypktcgfeow.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_QbDAODnEQXlm1xwjttQvLQ_Sd8ezUFF';
export const FUNCTIONS_BASE_URL = `${SUPABASE_URL}/functions/v1`;

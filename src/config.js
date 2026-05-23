export const SB_URL = import.meta.env.VITE_SUPABASE_URL;
export const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const PROXY_URL = `${SB_URL}/functions/v1/openai-proxy`;
export const REDIRECT_URL = import.meta.env.VITE_REDIRECT_URL || window.location.origin + '/katha/';
export const BUILD_LABEL = import.meta.env.VITE_BUILD_LABEL || __BUILD_LABEL__;

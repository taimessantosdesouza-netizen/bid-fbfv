// Configuração do cliente Supabase para o BID FBFV.
// Preencha window.BID_CONFIG ou injete variáveis no build da Vercel.
const CONFIG = window.BID_CONFIG || {
  supabaseUrl: "https://fbuxwhwrwrmwftnaqnhb.supabase.co",
  supabaseAnonKey: "sb_publishable_9B6nB17tzWQkEvB7-RFF7w_2YeLxUjQ"
};

function hasSupabaseConfig() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase);
}

const supabaseClient = hasSupabaseConfig()
  ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
  : null;

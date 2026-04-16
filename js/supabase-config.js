// Supabase Configuration
const SUPABASE_URL = 'https://qczrxqxwowfkltkbcyho.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjenJ4cXh3b3dma2x0a2JjeWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjE1MDgsImV4cCI6MjA5MTg5NzUwOH0.VPDdz5bGuneuXSxAlhjMpFZbAzAkYeF9nYfgbopkZoE';

let supabaseClient = null;

function initSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window.supabase = supabaseClient;
        console.log('✅ Supabase initialized');
        window.dispatchEvent(new Event('supabaseReady'));
        return true;
    }
    return false;
}

if (!initSupabase()) {
    const interval = setInterval(() => {
        if (initSupabase()) clearInterval(interval);
    }, 100);
}

window.supabaseClient = supabaseClient;
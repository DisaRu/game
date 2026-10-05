// supabase.js — ЭТОТ ФАЙЛ НЕ ВЫКЛАДЫВАЙ НА GITHUB
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lmdxmyyiaykrislsogyx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vB9Smhlj39YQVky07fLmvw_xvqT-m0x';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
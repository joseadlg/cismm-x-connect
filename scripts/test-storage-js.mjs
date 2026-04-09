import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const anonKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, anonKey);

async function test() {
    const { data, error } = await supabase.storage.listBuckets();
    console.log('Buckets:', data);
    console.log('Error:', error);
}

test();

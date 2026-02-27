import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const anonKey = env['VITE_SUPABASE_ANON_KEY'];

console.log('Testing connection to:', supabaseUrl);

fetch(`${supabaseUrl}/storage/v1/bucket/avatars`, {
    headers: {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey
    }
})
    .then(res => res.json())
    .then(data => console.log('Bucket Details:', data))
    .catch(err => console.error('Fetch error:', err.message));

const fs = require('fs');

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
    .then(res => {
        console.log('Response status:', res.status);
        return res.text();
    })
    .then(text => console.log('Response body:', text))
    .catch(err => console.error('Fetch error:', err.message));

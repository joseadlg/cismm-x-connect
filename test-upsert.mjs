import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://oiuczdclehkiouqgmvsh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdWN6ZGNsZWhraW91cWdtdnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzg4NDMsImV4cCI6MjA4NzcxNDg0M30.-azRTY1qRAOfIBVw2cwGJEQnPw8m22SWnnw39VGceus');

async function test() {
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: 'jose.aguilar@universidadkirei.edu.mx',
        password: 'cismm-jose.aguilar@universidadkirei.edu.mx-secret'
    });

    if (error) {
        console.log('SignIn Error:', error);
        return;
    }

    console.log('SignIn Success! User ID:', signInData.user.id);

    // Try the upsert just like the UI does
    const { data: upsertData, error: profileCheckError } = await supabase.from('profiles').upsert([
        { id: signInData.user.id, name: 'Carlos Test', role: 'attendee' }
    ], { onConflict: 'id', ignoreDuplicates: true }).select('*');

    console.log('Upsert Error:', profileCheckError);
    console.log('Upsert Data:', upsertData);

    // Try to read the profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', signInData.user.id);
    console.log('Profile Read:', profile);
}
test();

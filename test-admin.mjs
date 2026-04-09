import { createClient } from '@supabase/supabase-js';

// Using SERVICE ROLE KEY to bypass RLS and read policies
const supabaseAdmin = createClient('https://oiuczdclehkiouqgmvsh.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdWN6ZGNsZWhraW91cWdtdnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEzODg0MywiZXhwIjoyMDg3NzE0ODQzfQ.oKzMFRu2rI7TFY41eUaJ3FzYQ8wX9sL74xU2jU-aigc');

async function test() {
    const { data, error } = await supabaseAdmin.from('profiles').select('*').limit(1);
    console.log('Admin can read?', !!data);

    // Try querying pg_policies via RPC if it exists, otherwise just try to insert the row manually as admin
    console.log('Attempting to fix the orphaned profile manually as admin...');
    const { error: fixError } = await supabaseAdmin.from('profiles').upsert([
        { id: 'a1b0c4ac-577e-4111-b812-a4fbbcef38c2', name: 'Jose Carlos Aguilar De la Garza', role: 'attendee' }
    ], { onConflict: 'id', ignoreDuplicates: true });

    console.log('Admin Fix Error:', fixError);
}
test();

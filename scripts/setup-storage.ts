import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

async function setupCors() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars');
        Deno.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.storage.updateBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 1024 * 1024 * 2, // 2MB
    });

    if (error) {
        console.error('Failed to update bucket', error);
    } else {
        console.log('Bucket updated successfully', data);
    }
}

setupCors();

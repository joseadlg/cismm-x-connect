import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, payload } = await req.json();

        // 1. Verify Authentication of the requester (must be admin)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // Get the user who sent the request
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        // Make sure they have the 'admin' role in profiles
        const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') {
            throw new Error('Forbidden. Solo administradores pueden realizar esta acción.');
        }

        // 2. Initialize Service Role client to bypass RLS and create users silently
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 3. Process actions
        if (action === 'CREATE_STAFF') {
            const { email, password, name, role, exhibitorId, maxDevices } = payload;

            // Attempt to create user in Auth
            const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm
                user_metadata: { full_name: name }
            });

            if (createError) {
                // If already exists, we will fail cleanly
                throw new Error('El usuario ya existe o hubo un error en Auth: ' + createError.message);
            }

            // Automatically create their profile
            if (authData.user) {
                let defaultDeviceLimit = role === 'exhibitor' ? 3 : 1;
                if (role === 'admin') defaultDeviceLimit = 999; // Arbitrary high number for admin fallback

                const { error: profileError } = await supabaseAdmin.from('profiles').insert([
                    {
                        id: authData.user.id,
                        name,
                        role,
                        exhibitor_id: exhibitorId || null,
                        max_devices: maxDevices !== undefined ? maxDevices : defaultDeviceLimit
                    }
                ]);
                if (profileError) throw profileError;
            }

            return new Response(JSON.stringify({ success: true, user: authData.user }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        return new Response(JSON.stringify({ error: 'Acción no válida' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});

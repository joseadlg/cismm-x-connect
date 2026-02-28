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

        // Initialize Service Role client (bypasses RLS, used to manage users)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Verify Authentication - extract JWT and verify via service role client
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: No auth header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized: ' + (authError?.message ?? 'no user') }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 2. Make sure they have the 'admin' role in profiles
        const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: `Forbidden. Rol actual: ${profile?.role ?? 'sin perfil'}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 3. Process actions
        if (action === 'CREATE_STAFF') {
            const { email, password, name, role, exhibitorId, maxDevices } = payload;

            // Attempt to create user in Auth
            const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: name }
            });

            if (createError) {
                return new Response(JSON.stringify({ error: 'Error en Auth: ' + createError.message }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

            // Automatically create their profile
            if (authData.user) {
                let defaultDeviceLimit = role === 'exhibitor' ? 3 : 1;
                if (role === 'admin') defaultDeviceLimit = 999;

                const { error: profileError } = await supabaseAdmin.from('profiles').insert([
                    {
                        id: authData.user.id,
                        name,
                        role,
                        exhibitor_id: exhibitorId || null,
                        max_devices: maxDevices !== undefined ? maxDevices : defaultDeviceLimit
                    }
                ]);
                if (profileError) {
                    return new Response(JSON.stringify({ error: 'Error al crear perfil: ' + profileError.message }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    });
                }
            }

            return new Response(JSON.stringify({ success: true, user: authData.user }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        return new Response(JSON.stringify({ error: 'Accion no valida' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});

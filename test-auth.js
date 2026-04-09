const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://oiuczdclehkiouqgmvsh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdWN6ZGNsZWhraW91cWdtdnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzg4NDMsImV4cCI6MjA4NzcxNDg0M30.-azRTY1qRAOfIBVw2cwGJEQnPw8m22SWnnw39VGceus');

async function test() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'jose.aguilar@universidadkirei.edu.mx',
        password: 'cismm-jose.aguilar@universidadkirei.edu.mx-secret'
    });
    console.log('SignIn error object:');
    console.log(error ? error.message : 'No error (success)');

    if (error && error.message.includes('Invalid login credentials')) {
        console.log('Would trigger sign-up block');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'jose.aguilar@universidadkirei.edu.mx',
            password: 'cismm-jose.aguilar@universidadkirei.edu.mx-secret',
            options: { data: { full_name: 'Jose' } }
        });
        console.log('SignUp error:', signUpError);
        console.log('SignUp User Session Data:', !!signUpData.session);
    }
}
test();

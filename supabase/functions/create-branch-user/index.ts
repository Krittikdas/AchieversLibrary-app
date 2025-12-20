// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with Service Role Key (secure backend-only key)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get request body
        const { email, password, branch_id, branch_name } = await req.json()

        console.log(`Creating user for branch: ${branch_name} (${email})`)

        // 1. Create the Auth User
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto-confirm the user
            user_metadata: {
                branch_id: branch_id,
                role: 'RECEPTION',
                branch_name: branch_name
            }
        })

        if (userError) {
            console.error('Error creating user:', userError)
            return new Response(
                JSON.stringify({ error: userError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const userId = userData.user.id

        // 2. Create the Profile (if not handled by DB triggers)
        // We do it here to ensure it exists before returning success
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                role: 'RECEPTION',
                branch_id: branch_id
            })

        if (profileError) {
            console.error('Error creating profile:', profileError)
            // Attempt cleanup
            await supabase.auth.admin.deleteUser(userId)
            return new Response(
                JSON.stringify({ error: 'Failed to create user profile: ' + profileError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        return new Response(
            JSON.stringify({ user: userData.user, message: 'User created successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

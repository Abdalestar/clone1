// Supabase Edge Function: Generate One-Time Stamps
// This function creates batch QR codes for businesses

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers for web app to call this function
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
    // Get Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current user from auth token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Parse request body
    const { businessId, quantity, expiryDays } = await req.json()

    // Validate inputs
    if (!businessId || !quantity || !expiryDays) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: businessId, quantity, expiryDays' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Validate quantity limits (prevent abuse)
    if (quantity < 1 || quantity > 500) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be between 1 and 500' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Verify user owns this business
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('id, name, owner_user_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    if (business.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You do not own this business' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays))

    // Generate stamps
    const stamps = []
    for (let i = 0; i < quantity; i++) {
      const stampCode = `STAMP_${crypto.randomUUID()}`
      stamps.push({
        business_id: businessId,
        stamp_code: stampCode,
        expires_at: expiresAt.toISOString(),
        status: 'active',
      })
    }

    // Insert stamps into database
    const { data, error } = await supabaseClient
      .from('one_time_stamps')
      .insert(stamps)
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create stamps', details: error.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully created ${quantity} stamps`,
        stamps: data,
        businessName: business.name,
        expiresAt: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

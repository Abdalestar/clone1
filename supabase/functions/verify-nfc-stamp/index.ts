import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  tag_uid: string;
  encrypted_payload: string;
  user_id: string;
}

interface NFCTag {
  uid: string;
  business_id: string;
  branch_number: number;
  is_active: boolean;
}

interface Business {
  id: string;
  encryption_key: string;
  stamps_required: number;
}

async function decryptPayload(encryptedData: string, key: string): Promise<any> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.digest('SHA-256', keyData),
      { name: 'AES-CBC', length: 256 },
      false,
      ['decrypt']
    );

    const [ivHex, cipherHex] = encryptedData.split(':');
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decrypted);
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Decryption failed');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { tag_uid, encrypted_payload, user_id }: RequestBody = await req.json();

    if (!tag_uid || !encrypted_payload || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: tagData, error: tagError } = await supabaseClient
      .from('nfc_tags')
      .select('uid, business_id, branch_number, is_active')
      .eq('uid', tag_uid)
      .single();

    if (tagError || !tagData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid NFC tag' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const tag = tagData as NFCTag;

    if (!tag.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'NFC tag is inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { data: businessData, error: businessError } = await supabaseClient
      .from('businesses')
      .select('id, encryption_key, stamps_required')
      .eq('id', tag.business_id)
      .single();

    if (businessError || !businessData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Business not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const business = businessData as Business;

    let decryptedPayload;
    try {
      decryptedPayload = await decryptPayload(encrypted_payload, business.encryption_key);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload encryption' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (decryptedPayload.business_id !== tag.business_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payload mismatch with tag' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentStamps, error: logError } = await supabaseClient
      .from('stamp_collection_log')
      .select('id')
      .eq('user_id', user_id)
      .eq('business_id', tag.business_id)
      .gte('collected_at', twentyFourHoursAgo);

    if (logError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit check failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (recentStamps && recentStamps.length >= 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded: maximum 2 stamps per day' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    const { data: stampCard, error: cardError } = await supabaseClient
      .from('stamp_cards')
      .select('id, stamps_collected, is_completed')
      .eq('user_id', user_id)
      .eq('business_id', tag.business_id)
      .eq('is_completed', false)
      .single();

    let stampCardId: string;
    let stampsCollected: number;

    if (cardError || !stampCard) {
      const { data: newCard, error: createError } = await supabaseClient
        .from('stamp_cards')
        .insert({
          user_id,
          business_id: tag.business_id,
          stamps_collected: 0,
          is_completed: false,
        })
        .select()
        .single();

      if (createError || !newCard) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create stamp card' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      stampCardId = newCard.id;
      stampsCollected = 0;
    } else {
      stampCardId = stampCard.id;
      stampsCollected = stampCard.stamps_collected;
    }

    const { error: stampError } = await supabaseClient.from('stamps').insert({
      stamp_card_id: stampCardId,
      method: 'nfc',
    });

    if (stampError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to add stamp' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const newStampCount = stampsCollected + 1;
    const isCompleted = newStampCount >= business.stamps_required;

    const { error: updateError } = await supabaseClient
      .from('stamp_cards')
      .update({
        stamps_collected: newStampCount,
        is_completed: isCompleted,
      })
      .eq('id', stampCardId);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update stamp card' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const { error: logInsertError } = await supabaseClient.from('stamp_collection_log').insert({
      user_id,
      business_id: tag.business_id,
      tag_uid,
    });

    if (logInsertError) {
      console.error('Failed to log stamp collection:', logInsertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stamp_card_id: stampCardId,
        stamps_collected: newStampCount,
        is_completed: isCompleted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

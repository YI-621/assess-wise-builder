import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // 1. CORS Headers (Allows your React app to connect)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Catch the data sent from your React app
    const { userEmail, action, documentName } = await req.json()

    // 3. Get your secure cloud keys from Supabase environment variables
    const ELASTIC_URL = Deno.env.get('ELASTIC_URL');
    const ELASTIC_API_KEY = Deno.env.get('ELASTIC_API_KEY');

    if (!ELASTIC_URL || !ELASTIC_API_KEY) {
      throw new Error("Missing Elastic Cloud configuration!");
    }

    // 4. Format the audit log
    const auditEvent = {
      "@timestamp": new Date().toISOString(),
      user_email: userEmail,
      action: action,
      documentName: documentName,
      system: "SmartXcess"
    }

    // 5. Send DIRECTLY to Elastic Cloud (to an index named 'exam-audit-logs')
    const response = await fetch(`${ELASTIC_URL}/exam-audit-logs/_doc`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${ELASTIC_API_KEY}` 
      },
      body: JSON.stringify(auditEvent)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Elasticsearch rejected the log: ${errorBody}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Log securely saved in Elastic Cloud!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
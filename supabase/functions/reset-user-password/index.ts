import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { email, new_password } = await req.json();

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find user by email
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    return new Response(JSON.stringify({ error: listError.message }), { status: 400, headers: corsHeaders });
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: new_password });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
});

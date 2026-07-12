import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];

if (!supabaseUrl || !supabaseKey) {
  console.error("Usage: node test-supabase.js <URL> <ANON_KEY>");
  console.error("Or paste keys below:");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("🔌 Testing Supabase connection...\n");

  // Test 1: Auth endpoint
  const { data: authData, error: authError } = await supabase.auth.getSession();
  console.log(`1. Auth getSession: ${authError ? "❌ " + authError.message : "✅ OK"}`);

  // Test 2: Try to list tables via profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, role", { count: "exact", head: true });

  if (profilesError) {
    console.log(`2. Profiles table: ❌ ${profilesError.message}`);
    if (profilesError.message.includes("relation") || profilesError.message.includes("does not exist")) {
      console.log("   → O schema SQL ainda não foi executado no Supabase.");
    }
    if (profilesError.message.includes("permission") || profilesError.message.includes("policy")) {
      console.log("   → Pode ser problema de RLS ou permissão.");
    }
  } else {
    console.log(`2. Profiles table: ✅ OK (${profiles} profiles found)`);
  }

  // Test 3: Check connection without table
  const { error: healthError } = await supabase.from("_health").select("*").limit(1).maybeSingle();
  console.log(`3. Connection: ${healthError ? "⚠️  (expected if no _health table)" : "✅"}`);

  console.log(`\n📋 URL: ${supabaseUrl ? "✓" : "✗"}`);
  console.log(`📋 KEY: ${supabaseKey.startsWith("eyJ") ? "✓" : "✗"}`);
}

test().catch(console.error);

export function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid URL like https://<project-ref>.supabase.co",
    );
  }

  const hostMatch = parsedUrl.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (!hostMatch) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL host looks invalid. Use the exact Project URL from Supabase: https://<20-char-project-ref>.supabase.co",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

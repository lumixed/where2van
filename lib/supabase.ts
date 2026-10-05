import { createClient } from "@supabase/supabase-js";

// Both values come from the Supabase dashboard and live in `.env.local`.
// The key is the public "publishable" (anon) key. Never use the secret
// (service_role) key here: everything in this file reaches the browser.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

/** `null` until the keys are filled in; the app then stays on this device only. */
export const supabase =
  url && key
    ? // There are no accounts: the map is open to whoever has the link.
      createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

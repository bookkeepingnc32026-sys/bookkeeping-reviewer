import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";

const accountSetupMessage =
  "We couldn't finish setting up your learning account. Please try again shortly or contact the site administrator.";

/** The database restores only the authenticated user's missing account records.
 * Existing profiles, including their administrator roles, are preserved.
 */
export async function getLearnerProfile(
  db: SupabaseClient,
  userId: string,
): Promise<Profile> {
  const recovered = await db.rpc("ensure_learner_profile");
  let profile = recovered.data;
  if (recovered.error) {
    // Keep existing accounts working during a rolling database deployment.
    if (recovered.error.code !== "PGRST202") throw recovered.error;
    const existing = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    profile = existing.data;
  }
  if (!profile || profile.id !== userId) throw new Error(accountSetupMessage);
  return profile as Profile;
}

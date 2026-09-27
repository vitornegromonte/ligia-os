import { supabase } from "../lib/supabase.js";

export async function fetchMyMembershipRequests(profileId) {
  const { data, error } = await supabase.from("membership_requests").select("*")
    .eq("profile_id", profileId).order("requested_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function submitMembershipRequest(details) {
  const { data, error } = await supabase.rpc("submit_membership_request", { member_details: details });
  if (error) throw error;
  return data;
}

export async function fetchMembershipRequests() {
  const { data, error } = await supabase.from("membership_requests").select("*")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function reviewMembershipRequest(requestId, approve) {
  const { data, error } = await supabase.rpc("review_membership_request", { request_id: requestId, approve });
  if (error) throw error;
  return data;
}

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
  const requests = data || [];
  const profileIds = [...new Set(requests.map(request => request.profile_id).filter(Boolean))];
  if (!profileIds.length) return requests;
  const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,email").in("id", profileIds);
  if (profileError) throw profileError;
  const emailById = new Map((profiles || []).map(profile => [profile.id, profile.email]));
  return requests.map(request => ({ ...request, applicant_email: emailById.get(request.profile_id) || "" }));
}

export async function reviewMembershipRequest(requestId, approve) {
  const { data, error } = await supabase.rpc("review_membership_request", { request_id: requestId, approve });
  if (error) throw error;
  return data;
}

export function membershipMessage(error, action = "submit") {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  if (error instanceof TypeError || /fetch|network|connection/.test(message) || error?.status >= 500) return "Falha temporária de conexão. Tente novamente.";
  if (/already.*pending|duplicate key|membership_requests_one_pending/.test(message)) return "Você já tem uma solicitação de acesso em análise.";
  if (/not eligible/.test(message)) return "Não foi possível abrir a solicitação. Confira se você ainda é Externo e se já não existe um pedido em análise.";
  if (/pending request not found|applicant state changed/.test(message)) return "Esta solicitação já foi analisada ou o acesso da pessoa mudou. Atualize a página e tente novamente.";
  if (/administrator required/.test(message) || code === "42501") return "Seu perfil não tem permissão para esta ação.";
  if (/complete name|invalid parameter value/.test(message) || code === "22023") return "Confira os campos obrigatórios: nome, equipe e área de atuação.";
  if (action === "review") return "Não foi possível registrar a validação do acesso. Atualize a página e tente novamente.";
  if (action === "load") return "Não foi possível carregar as solicitações de acesso. Tente novamente.";
  return "Não foi possível enviar a solicitação de acesso. Tente novamente.";
}

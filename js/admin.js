let clubsCache = [];
let playersCache = [];

function setFeedback(msg, isError = false) {
  const el = document.getElementById("adminFeedback");
  if (!el) return;
  el.textContent = msg;
  el.style.background = isError ? "#fef2f2" : "#eff6ff";
  el.style.borderColor = isError ? "#fecaca" : "#bfdbfe";
  el.style.color = isError ? "#b91c1c" : "#1e40af";
  el.classList.remove("hidden");
}

async function refreshAdminSelects() {
  if (!supabaseClient) return;

  const [{ data: clubs }, { data: players }] = await Promise.all([
    supabaseClient.from("clubs").select("id, name, short_name, uf").order("name"),
    supabaseClient.from("players").select("id, full_name, position").order("full_name")
  ]);

  clubsCache = clubs || [];
  playersCache = players || [];

  const clubOptions = '<option value="">Sem clube / Livre</option>' +
    clubsCache.map((c) => `<option value="${c.id}">${c.name} (${c.short_name} - ${c.uf || ""})</option>`).join("");

  const fromSelect = document.getElementById("fromClubSelect");
  const toSelect = document.getElementById("toClubSelect");
  const playerClubSelect = document.getElementById("playerClubSelect");

  if (fromSelect) fromSelect.innerHTML = clubOptions;
  if (toSelect) toSelect.innerHTML = clubOptions;
  if (playerClubSelect) playerClubSelect.innerHTML = clubOptions;

  const playerSelect = document.getElementById("transferPlayerSelect");
  if (playerSelect) {
    playerSelect.innerHTML = '<option value="">Selecione o atleta</option>' +
      playersCache.map((p) => `<option value="${p.id}">${p.full_name} (${p.position})</option>`).join("");
  }
}

async function checkSession() {
  const loginBox = document.getElementById("loginPanel");
  const dashBox = document.getElementById("adminDashboard");

  if (!supabaseClient) {
    setFeedback("Configure a URL e chave anon do Supabase em js/config.js antes de usar o painel administrativo.", true);
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    loginBox?.classList.remove("hidden");
    dashBox?.classList.add("hidden");
    return;
  }

  loginBox?.classList.add("hidden");
  dashBox?.classList.remove("hidden");
  document.getElementById("adminUserEmail").textContent = session.user.email || "Administrador";
  await refreshAdminSelects();
}

document.addEventListener("DOMContentLoaded", () => {
  checkSession();

  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabaseClient) return;
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      setFeedback("Falha no login: " + error.message, true);
      return;
    }
    setFeedback("Sessão iniciada com sucesso.");
    await checkSession();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    await checkSession();
  });

  document.getElementById("clubForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("clubName").value.trim();
    const short_name = document.getElementById("clubShort").value.trim().toUpperCase();
    const uf = document.getElementById("clubUf").value.trim().toUpperCase();
    const logo_url = document.getElementById("clubLogoUrl").value.trim() || null;

    const { error } = await supabaseClient.from("clubs").insert({ name, short_name, uf, logo_url });
    if (error) return setFeedback("Erro ao cadastrar clube: " + error.message, true);

    e.target.reset();
    setFeedback("Clube cadastrado com sucesso!");
    await refreshAdminSelects();
  });

  document.getElementById("playerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const full_name = document.getElementById("playerName").value.trim();
    const nickname = document.getElementById("playerNickname").value.trim() || null;
    const position = document.getElementById("playerPosition").value;
    const birth_date = document.getElementById("playerBirthDate").value || null;
    const photo_url = document.getElementById("playerPhotoUrl").value.trim() || null;
    const current_club_id = document.getElementById("playerClubSelect").value || null;

    const { error } = await supabaseClient.from("players").insert({
      full_name,
      nickname,
      position,
      birth_date,
      photo_url,
      current_club_id
    });
    if (error) return setFeedback("Erro ao cadastrar atleta: " + error.message, true);

    e.target.reset();
    setFeedback("Atleta cadastrado com sucesso!");
    await refreshAdminSelects();
  });

  document.getElementById("transferForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const protocol_code = document.getElementById("protocolCode").value.trim().toUpperCase();
    const bid_registration = document.getElementById("bidRegistration").value.trim() || null;
    const player_id = document.getElementById("transferPlayerSelect").value;
    const from_club_id = document.getElementById("fromClubSelect").value || null;
    const to_club_id = document.getElementById("toClubSelect").value || null;
    const movement_type = document.getElementById("movementType").value;
    const start_date = document.getElementById("startDate").value || null;
    const fee_label = document.getElementById("feeLabel").value.trim() || "Sem custo";
    const status = document.getElementById("transferStatus").value;

    const { error } = await supabaseClient.from("transfers").insert({
      protocol_code,
      bid_registration,
      player_id,
      from_club_id,
      to_club_id,
      movement_type,
      start_date,
      fee_label,
      status
    });

    if (error) return setFeedback("Erro ao publicar no BID: " + error.message, true);

    if (status === "PUBLICADO" && player_id) {
      await supabaseClient.from("players").update({ current_club_id: to_club_id }).eq("id", player_id);
    }

    e.target.reset();
    setFeedback("Publicação registrada no BID!");
    await refreshAdminSelects();
  });
});

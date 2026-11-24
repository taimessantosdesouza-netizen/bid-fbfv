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

function randomSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function randomSevenDigitContract(uf = "BR") {
  const num = Math.floor(1000000 + Math.random() * 9000000);
  return `${num}${(uf || "BR").toUpperCase()}`;
}

async function uploadImageToBidBucket(file, folder) {
  if (!file) return null;

  const maxBytes = 3 * 1024 * 1024; // 3 MB
  if (file.size > maxBytes) {
    throw new Error("A imagem deve ter no máximo 3 MB.");
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${folder}/${safeName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("bid-imagens")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined
    });

  if (uploadError) {
    throw new Error("Falha ao enviar imagem: " + uploadError.message);
  }

  const { data } = supabaseClient.storage
    .from("bid-imagens")
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

async function generateUniqueBidRegistration() {
  if (!supabaseClient) return randomSixDigitCode();

  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = randomSixDigitCode();
    const { data, error } = await supabaseClient
      .from("transfers")
      .select("id")
      .eq("bid_registration", candidate)
      .limit(1);

    if (!error && (!data || data.length === 0)) {
      return candidate;
    }
  }

  return String(Date.now()).slice(-6);
}

async function generateUniqueContractCode(uf = "BR") {
  if (!supabaseClient) return randomSevenDigitContract(uf);

  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = randomSevenDigitContract(uf);
    const { data, error } = await supabaseClient
      .from("transfers")
      .select("id")
      .eq("protocol_code", candidate)
      .limit(1);

    if (!error && (!data || data.length === 0)) {
      return candidate;
    }
  }

  return `${String(Date.now()).slice(-7)}${(uf || "BR").toUpperCase()}`;
}

async function getExistingBidForPlayer(playerId) {
  if (!supabaseClient || !playerId) return "";

  const { data, error } = await supabaseClient
    .from("transfers")
    .select("bid_registration")
    .eq("player_id", playerId)
    .not("bid_registration", "is", null)
    .order("published_at", { ascending: false })
    .limit(1);

  if (error || !data || !data.length) return "";
  return data[0].bid_registration || "";
}

async function refreshAdminSelects() {
  if (!supabaseClient) return;

  const [{ data: clubs }, { data: players }] = await Promise.all([
    supabaseClient.from("clubs").select("id, name, short_name, uf").order("name"),
    supabaseClient.from("players").select("id, full_name, position, current_club_id").order("full_name")
  ]);

  clubsCache = clubs || [];
  playersCache = players || [];

  const clubOptions = '<option value="">-- Sem clube / Livre --</option>' +
    clubsCache.map((c) => `<option value="${c.id}">${c.name} (${c.short_name} - ${c.uf || ""})</option>`).join("");

  const fromSelect = document.getElementById("fromClubSelect");
  const toSelect = document.getElementById("toClubSelect");
  const playerClubSelect = document.getElementById("playerClubSelect");

  if (fromSelect) fromSelect.innerHTML = clubOptions;
  if (toSelect) toSelect.innerHTML = clubOptions;
  if (playerClubSelect) playerClubSelect.innerHTML = clubOptions;

  const playerSelect = document.getElementById("transferPlayerSelect");
  if (playerSelect) {
    playerSelect.innerHTML = '<option value="">-- Selecione o Atleta --</option>' +
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

  document.getElementById("transferPlayerSelect")?.addEventListener("change", async (e) => {
    const playerId = e.target.value;
    const bidInput = document.getElementById("bidRegistration");
    const fromSelect = document.getElementById("fromClubSelect");
    if (!playerId) return;

    const selectedPlayer = playersCache.find((p) => p.id === playerId);
    if (selectedPlayer && fromSelect && selectedPlayer.current_club_id) {
      fromSelect.value = selectedPlayer.current_club_id;
    }

    if (bidInput) {
      const existingBid = await getExistingBidForPlayer(playerId);
      bidInput.value = existingBid || await generateUniqueBidRegistration();
    }
  });

  document.getElementById("generateContractBtn")?.addEventListener("click", async () => {
    const toClubId = document.getElementById("toClubSelect")?.value;
    const fromClubId = document.getElementById("fromClubSelect")?.value;
    const club = clubsCache.find((c) => c.id === toClubId) || clubsCache.find((c) => c.id === fromClubId);
    const uf = club?.uf || "BR";

    const contractInput = document.getElementById("protocolCode");
    if (contractInput) {
      contractInput.value = await generateUniqueContractCode(uf);
    }
  });

  document.getElementById("clubForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("clubName").value.trim();
    const short_name = document.getElementById("clubShort").value.trim().toUpperCase();
    const uf = document.getElementById("clubUf").value;
    const logoFile = document.getElementById("clubLogoFile")?.files?.[0] || null;

    if (!uf) return setFeedback("Selecione o estado (UF) do clube.", true);

    try {
      setFeedback("Enviando escudo e salvando clube...");
      const logo_url = await uploadImageToBidBucket(logoFile, "escudos");

      const { error } = await supabaseClient.from("clubs").insert({ name, short_name, uf, logo_url });
      if (error) return setFeedback("Erro ao cadastrar clube: " + error.message, true);

      e.target.reset();
      setFeedback("Clube cadastrado e escudo salvo com sucesso!");
      await refreshAdminSelects();
    } catch (err) {
      setFeedback(err.message || "Erro ao enviar escudo.", true);
    }
  });

  document.getElementById("playerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const full_name = document.getElementById("playerName").value.trim();
    const nickname = document.getElementById("playerNickname").value.trim() || null;
    const position = document.getElementById("playerPosition").value;
    const birth_date = document.getElementById("playerBirthDate").value || null;
    const photoFile = document.getElementById("playerPhotoFile")?.files?.[0] || null;
    const current_club_id = document.getElementById("playerClubSelect").value || null;

    if (!position) return setFeedback("Selecione a posição do atleta.", true);

    try {
      setFeedback("Enviando foto e salvando atleta...");
      const photo_url = await uploadImageToBidBucket(photoFile, "atletas");

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
      setFeedback("Atleta cadastrado e foto salva com sucesso!");
      await refreshAdminSelects();
    } catch (err) {
      setFeedback(err.message || "Erro ao enviar foto.", true);
    }
  });

  document.getElementById("transferForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const player_id = document.getElementById("transferPlayerSelect").value;
    const from_club_id = document.getElementById("fromClubSelect").value || null;
    const to_club_id = document.getElementById("toClubSelect").value || null;
    const movement_type = document.getElementById("movementType").value;
    const start_date = document.getElementById("startDate").value || null;
    const fee_label = document.getElementById("feeLabel").value;
    const status = document.getElementById("transferStatus").value;

    const targetClub = clubsCache.find((c) => c.id === to_club_id) || clubsCache.find((c) => c.id === from_club_id);
    const uf = targetClub?.uf || "BR";

    let protocol_code = document.getElementById("protocolCode").value.trim().toUpperCase();
    if (!protocol_code) {
      protocol_code = await generateUniqueContractCode(uf);
    }

    let bid_registration = document.getElementById("bidRegistration").value.trim();
    if (!bid_registration) {
      bid_registration = await generateUniqueBidRegistration();
    }

    let { error } = await supabaseClient.from("transfers").insert({
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

    if (error && error.code === "23505") {
      bid_registration = await generateUniqueBidRegistration();
      protocol_code = await generateUniqueContractCode(uf);
      const retry = await supabaseClient.from("transfers").insert({
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
      error = retry.error;
    }

    if (error) return setFeedback("Erro ao publicar no BID: " + error.message, true);

    if (status === "PUBLICADO" && player_id) {
      await supabaseClient.from("players").update({ current_club_id: to_club_id }).eq("id", player_id);
    }

    e.target.reset();
    setFeedback(`Publicação registrada no BID! Contrato: ${protocol_code} | Inscrição (BID): ${bid_registration}`);
    await refreshAdminSelects();
  });
});

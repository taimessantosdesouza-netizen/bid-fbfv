const client =
  typeof supabaseClient !== "undefined" && supabaseClient
    ? supabaseClient
    : typeof supabase !== "undefined" && supabase?.from
      ? supabase
      : null;

let allEntriesCache = [];
let clubsMap = new Map();
let playersMap = new Map();
let hasTriggeredSearch = false;

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDateBr(dateStr) {
  if (!dateStr) return "-";
  const clean = String(dateStr).slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTimeBr(dateTimeStr) {
  if (!dateTimeStr) return "-";
  const d = new Date(dateTimeStr);
  if (Number.isNaN(d.getTime())) return dateTimeStr;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(`${String(birthDateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function getMovementBadgeText(movementType) {
  const map = {
    TRANSFERENCIA: "TRANSFERÊNCIA",
    EMPRESTIMO: "EMPRÉSTIMO",
    RENOVACAO: "RENOVAÇÃO",
    RESCISAO: "RESCISÃO",
    LIBERAR: "LIBERADO",
    INSCRICAO: "INSCRITO"
  };
  return map[String(movementType || "").toUpperCase()] || String(movementType || "PUBLICADO");
}

function renderClubCrest(club, className, fallbackText = "CLB") {
  if (club?.logo_url) {
    return `<span class="${className}"><img src="${club.logo_url}" alt="${club.short_name || club.name || ""}" loading="lazy" /></span>`;
  }
  const label = (club?.short_name || fallbackText).slice(0, 3).toUpperCase();
  return `<span class="${className}">${label}</span>`;
}

function renderAthleteCard(entry) {
  const player = entry.player || playersMap.get(entry.player_id) || {};
  const currentClub =
    clubsMap.get(entry.to_club_id) ||
    clubsMap.get(player.current_club_id) ||
    null;
  const fromClub = clubsMap.get(entry.from_club_id) || null;

  const fullName = player.full_name || "Atleta sem nome";
  const badgeName = player.nickname || fullName.split(/\s+/)[0] || "ATLETA";
  const position = player.position || "-";
  const age = calculateAge(player.birth_date);
  const ageLabel = age !== null ? `${age} anos` : "-";
  const bidCode = entry.bid_registration || "-";
  const contractCode = entry.protocol_code || "-";
  const pubDate = formatDateTimeBr(entry.published_at || player.created_at);
  const startDate = entry.start_date
    ? formatDateBr(entry.start_date)
    : formatDateBr(entry.published_at || player.created_at);
  const movementText = getMovementBadgeText(entry.movement_type);

  const clubText = currentClub
    ? `${currentClub.name} (${currentClub.short_name || ""}) - ${currentClub.uf || ""}`
    : "SEM CLUBE / LIVRE";

  const photoHtml = player.photo_url
    ? `<img src="${player.photo_url}" alt="${fullName}" loading="lazy" />`
    : `<span class="athlete-photo-initials">${getInitials(fullName)}</span>`;

  return `
    <article class="athlete-card">
      <div class="athlete-badge-frame">
        <div class="athlete-badge-inner">
          <div class="athlete-photo-area">
            <div class="athlete-photo-box">
              ${photoHtml}
            </div>
            ${renderClubCrest(currentClub, "club-mini-crest", currentClub?.short_name || "FBFV")}
          </div>
          <div class="athlete-badge-footer">
            <div class="athlete-short-name">${badgeName}</div>
            <div class="athlete-movement-status">${movementText}</div>
          </div>
        </div>
      </div>

      <div class="athlete-info">
        <h2 class="athlete-full-name">${fullName}</h2>

        <ul class="athlete-meta-list">
          <li><strong>Posição:</strong> ${position}</li>
          <li><strong>Idade:</strong> ${ageLabel}</li>
          <li><strong>Inscrição:</strong> ${bidCode}</li>
          <li><strong>Nº Contrato:</strong> ${contractCode}</li>
          <li><strong>Publicado em:</strong> ${pubDate}</li>
          <li><strong>Data Início:</strong> ${startDate}</li>
          ${fromClub ? `<li><strong>Origem:</strong> ${fromClub.name} (${fromClub.short_name || ""})</li>` : ""}
          ${entry.fee_label ? `<li><strong>Condição:</strong> ${entry.fee_label}</li>` : ""}
        </ul>

        <div class="athlete-club-row">
          ${renderClubCrest(currentClub, "inline-club-crest", currentClub?.short_name || "FBFV")}
          <span>${clubText}</span>
        </div>

        <button
          class="btn-history-outline"
          type="button"
          data-player-id="${entry.player_id}"
          data-player-name="${encodeURIComponent(fullName)}"
        >
          VER HISTÓRICO COMPLETO
        </button>
      </div>
    </article>
  `;
}

function getFilteredEntries() {
  const dateVal = document.getElementById("filterDate")?.value || "";
  const ufVal = (document.getElementById("filterUf")?.value || "").trim().toUpperCase();
  const clubVal = document.getElementById("filterClub")?.value || "";
  const nameVal = (document.getElementById("filterName")?.value || "").trim().toLowerCase();

  return allEntriesCache.filter((item) => {
    const player = item.player || playersMap.get(item.player_id) || {};
    const club = clubsMap.get(item.to_club_id) || clubsMap.get(player.current_club_id) || null;

    if (dateVal) {
      const refDate = item.published_at || player.created_at || "";
      const pubDay = refDate ? new Date(refDate).toISOString().slice(0, 10) : "";
      const startDay = item.start_date ? String(item.start_date).slice(0, 10) : "";
      if (pubDay !== dateVal && startDay !== dateVal) {
        return false;
      }
    }

    if (ufVal) {
      const clubUf = String(club?.uf || "").toUpperCase();
      if (clubUf !== ufVal) return false;
    }

    if (clubVal) {
      const matchesTo = item.to_club_id === clubVal;
      const matchesFrom = item.from_club_id === clubVal;
      const matchesCurrent = player.current_club_id === clubVal;
      if (!matchesTo && !matchesFrom && !matchesCurrent) return false;
    }

    if (nameVal) {
      const fullName = String(player.full_name || "").toLowerCase();
      const nickname = String(player.nickname || "").toLowerCase();
      const bidReg = String(item.bid_registration || "").toLowerCase();
      const contract = String(item.protocol_code || "").toLowerCase();
      const matchesSearch =
        fullName.includes(nameVal) ||
        nickname.includes(nameVal) ||
        bidReg.includes(nameVal) ||
        contract.includes(nameVal);
      if (!matchesSearch) return false;
    }

    return true;
  });
}

function renderResultsView() {
  const emptyHome = document.getElementById("emptyHome");
  const resultsWrapper = document.getElementById("resultsWrapper");
  const grid = document.getElementById("bidCardsGrid");
  const countEl = document.getElementById("resultsCount");

  if (!hasTriggeredSearch) {
    emptyHome?.classList.remove("hidden");
    resultsWrapper?.classList.add("hidden");
    return;
  }

  emptyHome?.classList.add("hidden");
  resultsWrapper?.classList.remove("hidden");

  const filtered = getFilteredEntries();
  if (countEl) {
    countEl.innerHTML = `Exibindo <strong>${filtered.length}</strong> ${filtered.length === 1 ? "resultado" : "resultados"}`;
  }

  if (!grid) return;

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="admin-card" style="grid-column:1 / -1;text-align:center;">
        <p style="color:var(--text-muted);">Nenhum atleta encontrado com os filtros atuais.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(renderAthleteCard).join("");
}

function openHistoryModal(playerId, playerName) {
  const modal = document.getElementById("historyModal");
  const titleEl = document.getElementById("historyModalTitle");
  const bodyEl = document.getElementById("historyModalBody");
  if (!modal || !bodyEl) return;

  if (titleEl) {
    titleEl.textContent = `Histórico — ${playerName}`;
  }

  const playerHistory = allEntriesCache.filter((t) => t.player_id === playerId && t.is_transfer);
  if (!playerHistory.length) {
    bodyEl.innerHTML = `<p style="color:var(--text-muted);">Nenhum registro de movimentação publicado ainda para este atleta.</p>`;
  } else {
    bodyEl.innerHTML = playerHistory
      .map((item) => {
        const fromClub = clubsMap.get(item.from_club_id);
        const toClub = clubsMap.get(item.to_club_id);
        return `
          <div class="history-item">
            <div class="history-item-top">
              <span>${getMovementBadgeText(item.movement_type)}</span>
              <span>${formatDateTimeBr(item.published_at)}</span>
            </div>
            <div><strong>Inscrição:</strong> ${item.bid_registration || "-"} | <strong>Contrato:</strong> ${item.protocol_code || "-"}</div>
            <div><strong>Destino:</strong> ${toClub ? `${toClub.name} (${toClub.short_name || ""})` : "Sem clube / Livre"}</div>
            ${fromClub ? `<div><strong>Origem:</strong> ${fromClub.name} (${fromClub.short_name || ""})</div>` : ""}
            ${item.fee_label ? `<div><strong>Observação:</strong> ${item.fee_label}</div>` : ""}
          </div>
        `;
      })
      .join("");
  }

  modal.classList.remove("hidden");
}

async function loadBidData() {
  if (!client) {
    console.error("Cliente Supabase não encontrado em js/config.js.");
    return;
  }

  try {
    const [{ data: clubs, error: clubsErr }, { data: players, error: playersErr }, { data: transfers, error: transfersErr }] =
      await Promise.all([
        client.from("clubs").select("*").order("name"),
        client.from("players").select("*").order("full_name"),
        client
          .from("transfers")
          .select("*")
          .eq("status", "PUBLICADO")
          .order("published_at", { ascending: false })
      ]);

    if (clubsErr) console.error("Erro ao carregar clubes:", clubsErr);
    if (playersErr) console.error("Erro ao carregar atletas:", playersErr);
    if (transfersErr) console.error("Erro ao carregar publicações:", transfersErr);

    clubsMap = new Map((clubs || []).map((c) => [c.id, c]));
    playersMap = new Map((players || []).map((p) => [p.id, p]));

    const clubFilter = document.getElementById("filterClub");
    if (clubFilter) {
      const currentVal = clubFilter.value;
      clubFilter.innerHTML =
        '<option value="">Clube</option>' +
        (clubs || [])
          .map((c) => `<option value="${c.id}">${c.name}${c.uf ? ` (${c.uf})` : ""}</option>`)
          .join("");
      if (currentVal) clubFilter.value = currentVal;
    }

    const publishedTransfers = (transfers || []).map((t) => ({
      ...t,
      player: playersMap.get(t.player_id) || null,
      is_transfer: true
    }));

    const playersWithPublishedTransfer = new Set(publishedTransfers.map((t) => t.player_id));
    const standalonePlayers = (players || [])
      .filter((p) => !playersWithPublishedTransfer.has(p.id))
      .map((p) => ({
        id: `player-${p.id}`,
        player_id: p.id,
        player: p,
        to_club_id: p.current_club_id || null,
        from_club_id: null,
        movement_type: "INSCRICAO",
        published_at: p.created_at,
        is_transfer: false
      }));

    allEntriesCache = [...publishedTransfers, ...standalonePlayers];
    renderResultsView();
  } catch (err) {
    console.error("Erro inesperado no BID:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadBidData();

  document.getElementById("topFilterForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hasTriggeredSearch = true;
    await loadBidData();
  });

  document.getElementById("btnShowLatest")?.addEventListener("click", async () => {
    const dateInput = document.getElementById("filterDate");
    const ufInput = document.getElementById("filterUf");
    const clubInput = document.getElementById("filterClub");
    if (dateInput) dateInput.value = "";
    if (ufInput) ufInput.value = "";
    if (clubInput) clubInput.value = "";

    hasTriggeredSearch = true;
    await loadBidData();
  });

  document.getElementById("filterName")?.addEventListener("input", () => {
    hasTriggeredSearch = true;
    renderResultsView();
  });

  document.getElementById("filterUf")?.addEventListener("change", () => {
    if (hasTriggeredSearch) renderResultsView();
  });

  document.getElementById("filterClub")?.addEventListener("change", () => {
    if (hasTriggeredSearch) renderResultsView();
  });

  document.getElementById("filterDate")?.addEventListener("change", () => {
    if (hasTriggeredSearch) renderResultsView();
  });

  document.getElementById("bidCardsGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-history-outline");
    if (!btn) return;
    const playerId = btn.getAttribute("data-player-id");
    const playerName = decodeURIComponent(btn.getAttribute("data-player-name") || "Atleta");
    openHistoryModal(playerId, playerName);
  });

  document.getElementById("closeHistoryModal")?.addEventListener("click", () => {
    document.getElementById("historyModal")?.classList.add("hidden");
  });

  document.getElementById("historyModal")?.addEventListener("click", (e) => {
    if (e.target.id === "historyModal") {
      document.getElementById("historyModal")?.classList.add("hidden");
    }
  });
});

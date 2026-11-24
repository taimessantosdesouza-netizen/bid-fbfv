const DEMO_CLUBS = [
  { id: "c1", name: "TEAL RISING ACADEMY - SP", short_name: "TRA", uf: "SP", logo_url: "" },
  { id: "c2", name: "Futebol Clube Primeira Camisa Ltda - SP", short_name: "FCPC", uf: "SP", logo_url: "" },
  { id: "c3", name: "Sport Club Corinthians Virtual - SP", short_name: "COR", uf: "SP", logo_url: "" },
  { id: "c4", name: "Esporte Clube Bahia Virtual - BA", short_name: "BAH", uf: "BA", logo_url: "" }
];

const DEMO_TRANSFERS = [
  {
    id: "demo-1",
    protocol_code: "2947190SP",
    bid_registration: "958838",
    movement_type: "LIBERAR",
    fee_label: "Rescisão / Liberação",
    start_date: "",
    contract_until: "2027-12-31",
    status: "PUBLICADO",
    published_at: "2026-11-23T09:02:15",
    player: {
      id: "p1",
      full_name: "Ana Caroliny Fernandes de Oliveira",
      nickname: "ANA CAROLINY",
      position: "ATA",
      birth_date: "2009-10-09",
      photo_url: ""
    },
    from_club: { id: "c1", name: "TEAL RISING ACADEMY - SP", short_name: "TRA", uf: "SP", logo_url: "" },
    to_club: { id: "c1", name: "TEAL RISING ACADEMY - SP", short_name: "TRA", uf: "SP", logo_url: "" }
  },
  {
    id: "demo-2",
    protocol_code: "2947500SP",
    bid_registration: "870705",
    movement_type: "LIBERAR",
    fee_label: "Contrato Profissional",
    start_date: "",
    contract_until: "2028-12-31",
    status: "PUBLICADO",
    published_at: "2026-11-23T17:41:07",
    player: {
      id: "p2",
      full_name: "Andre Luiz Turci dos Santos",
      nickname: "ANDRÉ LUIZ",
      position: "MEI",
      birth_date: "2013-01-13",
      photo_url: ""
    },
    from_club: { id: "c2", name: "Futebol Clube Primeira Camisa Ltda - SP", short_name: "FCPC", uf: "SP", logo_url: "" },
    to_club: { id: "c2", name: "Futebol Clube Primeira Camisa Ltda - SP", short_name: "FCPC", uf: "SP", logo_url: "" }
  }
];

let allTransfers = [];
let allClubs = [];
let hasSearched = false;

function formatDateBR(dateStr, includeTime = false) {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return dateStr;
  const datePart = dt.toLocaleDateString("pt-BR");
  if (!includeTime) return datePart;
  const timePart = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${datePart} ${timePart}`;
}

function getInitials(name) {
  if (!name) return "AT";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

function getShortBadgeName(player) {
  if (player?.nickname) return player.nickname.toUpperCase();
  const parts = (player?.full_name || "ATLETA").trim().split(/\s+/);
  return parts.slice(0, 2).join(" ").toUpperCase();
}

function populateClubFilter(ufValue = "") {
  const clubSelect = document.getElementById("clubFilter");
  if (!clubSelect) return;

  const filteredClubs = ufValue
    ? allClubs.filter((c) => (c.uf || "").toUpperCase() === ufValue.toUpperCase())
    : allClubs;

  clubSelect.innerHTML = '<option value="">-- Todos os Clubes --</option>' +
    filteredClubs.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
}

function renderCards(items) {
  const grid = document.getElementById("bidCardsGrid");
  const countEl = document.getElementById("resultsCountText");
  if (!grid) return;

  if (countEl) {
    countEl.innerHTML = `Exibindo <strong>${items.length}</strong> ${items.length === 1 ? "resultado" : "resultados"}`;
  }

  if (!items.length) {
    grid.innerHTML = `
      <div class="athlete-card" style="grid-column: 1 / -1; justify-content: center; text-align: center; padding: 36px;">
        <p style="color: var(--text-muted);">Nenhum atleta ou publicação encontrada para os filtros selecionados.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map((row) => {
    const player = row.player || {};
    const club = row.to_club || row.from_club || { name: "Sem clube vinculado", short_name: "FBFV", uf: "" };
    const fullName = player.full_name || "Atleta não informado";
    const shortName = getShortBadgeName(player);
    const pubDate = formatDateBR(row.published_at, true);
    const startDate = formatDateBR(row.start_date, false);
    const birthDate = formatDateBR(player.birth_date, false) || "-";
    const bidCode = row.bid_registration || row.id.slice(0, 6).toUpperCase();
    const clubLabel = club.uf && !club.name.endsWith(`- ${club.uf}`) ? `${club.name} - ${club.uf}` : club.name;

    const photoHtml = player.photo_url
      ? `<img src="${player.photo_url}" alt="${fullName}" />`
      : `<span class="athlete-photo-initials">${getInitials(fullName)}</span>`;

    const miniCrestHtml = club.logo_url
      ? `<img src="${club.logo_url}" alt="${club.short_name}" />`
      : `<span>${(club.short_name || "FC").slice(0, 3)}</span>`;

    return `
      <article class="athlete-card">
        <div class="athlete-badge-frame">
          <div class="athlete-badge-inner">
            <div class="athlete-photo-area">
              <div class="athlete-photo-box">${photoHtml}</div>
              <div class="club-mini-crest" title="${clubLabel}">${miniCrestHtml}</div>
            </div>
            <div class="athlete-badge-footer">
              <div class="athlete-short-name">${shortName}</div>
              <div class="athlete-movement-status">${row.movement_type}</div>
            </div>
          </div>
        </div>

        <div class="athlete-info">
          <h2 class="athlete-full-name">${fullName}</h2>
          <ul class="athlete-meta-list">
            <li>Nº de Contrato: <strong>${row.protocol_code}</strong></li>
            <li>Publicação: <strong>${pubDate}</strong></li>
            <li>Data Início: <strong>${startDate}</strong></li>
            <li>Inscrição (BID): <strong>${bidCode}</strong></li>
            <li>Nascimento: <strong>${birthDate}</strong></li>
          </ul>

          <div class="athlete-club-row">
            <span class="inline-club-crest">${miniCrestHtml}</span>
            <span>${clubLabel}</span>
          </div>

          <button class="btn-history-outline" type="button" data-player-id="${player.id || ""}" data-player-name="${fullName}">
            VER HISTÓRICO COMPLETO
          </button>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".btn-history-outline").forEach((btn) => {
    btn.addEventListener("click", () => {
      openHistoryModal(btn.dataset.playerId, btn.dataset.playerName);
    });
  });
}

function applyFilters(showResults = true) {
  if (showResults) {
    hasSearched = true;
    document.getElementById("emptyHomeSection")?.classList.add("hidden");
    document.getElementById("resultsSection")?.classList.remove("hidden");
  }

  const dateVal = document.getElementById("dateFilter")?.value || "";
  const ufVal = (document.getElementById("ufFilter")?.value || "").trim().toUpperCase();
  const clubVal = document.getElementById("clubFilter")?.value || "";
  const nameQuery = (document.getElementById("nameSearchInput")?.value || "").trim().toLowerCase();

  const filtered = allTransfers.filter((item) => {
    const itemDate = (item.published_at || "").slice(0, 10);
    const matchesDate = !dateVal || itemDate === dateVal;

    const toUf = (item.to_club?.uf || "").toUpperCase();
    const fromUf = (item.from_club?.uf || "").toUpperCase();
    const matchesUf = !ufVal || toUf === ufVal || fromUf === ufVal;

    const matchesClub = !clubVal || item.to_club?.id === clubVal || item.from_club?.id === clubVal;

    const haystack = [
      item.player?.full_name,
      item.player?.nickname,
      item.protocol_code,
      item.bid_registration,
      item.to_club?.name,
      item.from_club?.name
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesName = !nameQuery || haystack.includes(nameQuery);
    return matchesDate && matchesUf && matchesClub && matchesName;
  });

  renderCards(filtered);
}

function openHistoryModal(playerId, playerName) {
  const modal = document.getElementById("historyModal");
  const titleEl = document.getElementById("historyModalTitle");
  const bodyEl = document.getElementById("historyModalBody");
  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = `Histórico Completo — ${playerName}`;

  const history = allTransfers.filter((t) =>
    (playerId && t.player?.id === playerId) || t.player?.full_name === playerName
  );

  if (!history.length) {
    bodyEl.innerHTML = "<p>Nenhuma movimentação registrada.</p>";
  } else {
    bodyEl.innerHTML = history.map((h) => `
      <div class="history-item">
        <div class="history-item-top">
          <span>${h.movement_type} • Contrato ${h.protocol_code}</span>
          <span>${formatDateBR(h.published_at, true)}</span>
        </div>
        <div>Origem: <strong>${h.from_club?.name || "Livre"}</strong> → Destino: <strong>${h.to_club?.name || "Livre"}</strong></div>
        <div>Condição: ${h.fee_label || "-"} | Inscrição BID: <strong>${h.bid_registration || "-"}</strong></div>
      </div>
    `).join("");
  }

  modal.classList.remove("hidden");
}

async function initBidData() {
  const noticeEl = document.getElementById("demoNotice");

  if (!supabaseClient) {
    allClubs = DEMO_CLUBS;
    allTransfers = DEMO_TRANSFERS;
    noticeEl?.classList.remove("hidden");
  } else {
    noticeEl?.classList.add("hidden");
    const [{ data: clubsData }, { data: transfersData, error }] = await Promise.all([
      supabaseClient.from("clubs").select("id, name, short_name, uf, logo_url").order("name"),
      supabaseClient
        .from("transfers")
        .select(`
          id,
          protocol_code,
          bid_registration,
          movement_type,
          fee_label,
          start_date,
          contract_until,
          status,
          published_at,
          player:players(id, full_name, nickname, position, birth_date, photo_url),
          from_club:clubs!transfers_from_club_id_fkey(id, name, short_name, uf, logo_url),
          to_club:clubs!transfers_to_club_id_fkey(id, name, short_name, uf, logo_url)
        `)
        .eq("status", "PUBLICADO")
        .order("published_at", { ascending: false })
    ]);

    allClubs = clubsData || [];
    if (error) {
      console.error("Erro ao carregar BID:", error);
      allTransfers = DEMO_TRANSFERS;
    } else {
      allTransfers = transfersData || [];
    }
  }

  populateClubFilter("");
}

document.addEventListener("DOMContentLoaded", async () => {
  await initBidData();

  document.getElementById("ufFilter")?.addEventListener("change", (e) => {
    populateClubFilter(e.target.value);
  });

  document.getElementById("topSearchBtn")?.addEventListener("click", () => {
    applyFilters(true);
  });

  document.getElementById("showAllBtn")?.addEventListener("click", () => {
    document.getElementById("dateFilter").value = "";
    document.getElementById("ufFilter").value = "";
    populateClubFilter("");
    document.getElementById("clubFilter").value = "";
    applyFilters(true);
  });

  document.getElementById("logoHomeBtn")?.addEventListener("click", () => {
    hasSearched = false;
    document.getElementById("resultsSection")?.classList.add("hidden");
    document.getElementById("emptyHomeSection")?.classList.remove("hidden");
  });

  document.getElementById("nameSearchInput")?.addEventListener("input", () => {
    if (hasSearched) applyFilters(false);
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

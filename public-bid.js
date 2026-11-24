const DEMO_TRANSFERS = [
  {
    id: "demo-1",
    protocol_code: "FBFV-2026-0013",
    movement_type: "TRANSFERENCIA",
    fee_label: "Livre / Sem custo",
    contract_until: "2027-12-31",
    status: "PUBLICADO",
    published_at: "2026-11-20T14:30:00Z",
    player: { full_name: "Lucas Andrade", position: "MEI" },
    from_club: { short_name: "ATL" },
    to_club: { short_name: "COR" }
  },
  {
    id: "demo-2",
    protocol_code: "FBFV-2026-0014",
    movement_type: "EMPRESTIMO",
    fee_label: "Empréstimo até fim da temporada",
    contract_until: "2026-12-20",
    status: "PUBLICADO",
    published_at: "2026-11-21T10:15:00Z",
    player: { full_name: "Rafael Menezes", position: "ATA" },
    from_club: { short_name: "BAH" },
    to_club: { short_name: "VIT" }
  }
];

let allTransfers = [];

function formatDate(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return Number.isNaN(d.getTime()) ? isoStr : d.toLocaleDateString("pt-BR");
}

function renderTransfers(items) {
  const tbody = document.getElementById("bidTableBody");
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="7">Nenhum registro encontrado para os filtros selecionados.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((row) => {
    const playerName = row.player?.full_name || "Atleta";
    const pos = row.player?.position || "-";
    const fromClub = row.from_club?.short_name || "Livre";
    const toClub = row.to_club?.short_name || "Livre";
    const statusClass = row.status === "PUBLICADO" ? "tag" : "tag tag-warn";

    return `
      <tr>
        <td><strong>${row.protocol_code}</strong></td>
        <td>${playerName} <span style="color:var(--muted)">(${pos})</span></td>
        <td>${fromClub} → <strong>${toClub}</strong></td>
        <td>${row.movement_type}</td>
        <td>${row.fee_label || "-"}</td>
        <td>${formatDate(row.published_at)}</td>
        <td><span class="${statusClass}">${row.status}</span></td>
      </tr>
    `;
  }).join("");
}

function applyFilters() {
  const query = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
  const typeFilter = document.getElementById("typeFilter")?.value || "";
  const statusFilter = document.getElementById("statusFilter")?.value || "";

  const filtered = allTransfers.filter((item) => {
    const matchesType = !typeFilter || item.movement_type === typeFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    const haystack = [
      item.protocol_code,
      item.player?.full_name,
      item.from_club?.short_name,
      item.to_club?.short_name
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesQuery = !query || haystack.includes(query);
    return matchesType && matchesStatus && matchesQuery;
  });

  renderTransfers(filtered);
}

async function loadBidData() {
  const noticeEl = document.getElementById("configNotice");

  if (!supabaseClient) {
    allTransfers = DEMO_TRANSFERS;
    if (noticeEl) noticeEl.classList.remove("hidden");
  } else {
    if (noticeEl) noticeEl.classList.add("hidden");
    const { data, error } = await supabaseClient
      .from("transfers")
      .select(`
        id,
        protocol_code,
        movement_type,
        fee_label,
        contract_until,
        status,
        published_at,
        player:players(full_name, position),
        from_club:clubs!transfers_from_club_id_fkey(short_name),
        to_club:clubs!transfers_to_club_id_fkey(short_name)
      `)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar BID:", error);
      allTransfers = DEMO_TRANSFERS;
    } else {
      allTransfers = data || [];
    }
  }

  document.getElementById("statTotal").textContent = String(allTransfers.length);
  document.getElementById("statPublished").textContent = String(
    allTransfers.filter((t) => t.status === "PUBLICADO").length
  );
  const uniqueClubs = new Set();
  allTransfers.forEach((t) => {
    if (t.from_club?.short_name) uniqueClubs.add(t.from_club.short_name);
    if (t.to_club?.short_name) uniqueClubs.add(t.to_club.short_name);
  });
  document.getElementById("statClubs").textContent = String(uniqueClubs.size);

  applyFilters();
}

document.addEventListener("DOMContentLoaded", () => {
  loadBidData();
  document.getElementById("searchInput")?.addEventListener("input", applyFilters);
  document.getElementById("typeFilter")?.addEventListener("change", applyFilters);
  document.getElementById("statusFilter")?.addEventListener("change", applyFilters);
  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("typeFilter").value = "";
    document.getElementById("statusFilter").value = "";
    applyFilters();
  });
});

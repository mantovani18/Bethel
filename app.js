(function () {
  const STORAGE_KEY = "salon-bookings-v2";

  const state = {
    current: new Date(),
    data: loadData(),
    reservations: loadReservations(),
  };

  const el = {
    currentMonth: document.getElementById("currentMonth"),
    prevMonth: document.getElementById("prevMonth"),
    nextMonth: document.getElementById("nextMonth"),
    calendar: document.getElementById("calendar"),
    upcomingCount: document.getElementById("upcomingCount"),
    upcomingList: document.getElementById("upcomingList"),
    searchDate: document.getElementById("searchDate"),
    searchBtn: document.getElementById("searchBtn"),
    searchResult: document.getElementById("searchResult"),
    openNewReservation: document.getElementById("openNewReservation"),
    reservationModal: document.getElementById("reservationModal"),
    closeModal: document.getElementById("closeModal"),
    cancelModal: document.getElementById("cancelModal"),
    confirmReservation: document.getElementById("confirmReservation"),
    formDate: document.getElementById("formDate"),
    formName: document.getElementById("formName"),
    formPhone: document.getElementById("formPhone"),
    formType: document.getElementById("formType"),
    formNotes: document.getElementById("formNotes"),
  };

  function ymd(year, monthIndex, day) {
    const m = monthIndex + 1;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const dd = day < 10 ? `0${day}` : `${day}`;
    return `${year}-${mm}-${dd}`;
  }
  function dmyFromISO(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  function isoFromDMY(dmy) {
    const parts = dmy.split("/");
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    if (!d || !m || !y) return null;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    localStorage.setItem(STORAGE_KEY + "-reservations", JSON.stringify(state.reservations));
  }
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  function loadReservations() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY + "-reservations");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function monthKey(d) { return `${d.getFullYear()}-${d.getMonth() + 1}`; }
  function getMonthData(d) { const k = monthKey(d); if (!state.data[k]) state.data[k] = {}; return state.data[k]; }
  function formatMonthTitle(d) {
    const m = d.toLocaleString("pt-BR", { month: "long" });
    return `${m.charAt(0).toUpperCase() + m.slice(1)} de ${d.getFullYear()}`;
  }
  function formatLongDate(iso) {
    const dt = new Date(iso);
    return dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }
  function daysInMonth(year, monthIndex) { return new Date(year, monthIndex + 1, 0).getDate(); }
  function firstWeekday(year, monthIndex) { return new Date(year, monthIndex, 1).getDay(); }
  function isPastDate(iso) {
    const now = new Date();
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function render() {
    el.currentMonth.textContent = formatMonthTitle(state.current);

    const year = state.current.getFullYear();
    const monthIndex = state.current.getMonth();
    const totalDays = daysInMonth(year, monthIndex);
    const startWeekday = firstWeekday(year, monthIndex);
    const monthData = getMonthData(state.current);

    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "weekdays";
    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((w) => {
      const d = document.createElement("div"); d.textContent = w; weekdaysRow.appendChild(d);
    });

    const grid = document.createElement("div"); grid.className = "grid";
    for (let i = 0; i < startWeekday; i++) {
      const blank = document.createElement("div"); blank.className = "day out"; grid.appendChild(blank);
    }
    for (let day = 1; day <= totalDays; day++) {
      const iso = ymd(year, monthIndex, day);
      const entry = monthData[iso] || { status: "available" };
      const cell = document.createElement("div");
      const status = isPastDate(iso) ? "past" : entry.status;
      cell.className = `day ${status}`;
      const todayIso = ymd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      if (iso === todayIso) cell.classList.add("selected");

      const dateEl = document.createElement("div"); dateEl.className = "date"; dateEl.textContent = String(day); cell.appendChild(dateEl);

      cell.addEventListener("click", () => openModal(iso));

      const dot = document.createElement("div"); dot.className = "status-dot"; cell.appendChild(dot);

      grid.appendChild(cell);
    }

    el.calendar.innerHTML = "";
    const wrapper = document.createElement("div"); wrapper.className = "calendar"; wrapper.appendChild(weekdaysRow); wrapper.appendChild(grid); el.calendar.appendChild(wrapper);

    renderUpcoming();
  }

  function setDayStatus(monthData, iso, status) { monthData[iso] = { status }; saveData(); }

  function renderUpcoming() {
    const upcoming = state.reservations
      .filter(r => !isPastDate(r.dateISO))
      .sort((a,b)=> a.dateISO.localeCompare(b.dateISO))
      .slice(0, 20);

    el.upcomingCount.textContent = String(upcoming.length);
    el.upcomingList.innerHTML = "";

    if (upcoming.length === 0) {
      const empty = document.createElement("div");
      empty.className = "upcoming-empty";
      const icon = document.createElement("div"); icon.className = "icon"; icon.textContent = "📅";
      const text = document.createElement("div"); text.textContent = "Nenhuma reserva agendada";
      empty.appendChild(icon); empty.appendChild(text);
      el.upcomingList.appendChild(empty);
      return;
    }

    for (const r of upcoming) {
      const card = document.createElement("div"); card.className = "upcoming-card";
      const dateRow = document.createElement("div"); dateRow.className = "row"; dateRow.textContent = new Date(r.dateISO).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); card.appendChild(dateRow);
      const nameRow = document.createElement("div"); nameRow.className = "row title"; nameRow.textContent = r.name; card.appendChild(nameRow);
      if (r.phone) { const phoneRow = document.createElement("div"); phoneRow.className = "row"; phoneRow.textContent = r.phone; card.appendChild(phoneRow); }
      if (r.type) { const typeRow = document.createElement("div"); typeRow.className = "row"; typeRow.textContent = r.type; card.appendChild(typeRow); }
      if (r.notes) { const notesRow = document.createElement("div"); notesRow.className = "row"; notesRow.textContent = r.notes; card.appendChild(notesRow); }
      const actions = document.createElement("div"); actions.className = "actions";
      const del = document.createElement("button"); del.className = "danger"; del.textContent = "Excluir"; del.addEventListener("click", () => { deleteReservation(r.id); });
      actions.appendChild(del); card.appendChild(actions);
      el.upcomingList.appendChild(card);
    }
  }

  function deleteReservation(id) {
    const idx = state.reservations.findIndex(x => x.id === id);
    if (idx >= 0) {
      const r = state.reservations[idx];
      const monthData = getMonthData(new Date(r.dateISO));
      monthData[r.dateISO] = { status: "available" };
      state.reservations.splice(idx, 1);
      saveData(); render();
    }
  }

  function openModal(prefillISO) {
    el.formDate.value = prefillISO || ""; // input type=date espera yyyy-mm-dd
    el.formName.value = ""; el.formPhone.value = ""; el.formType.value = ""; el.formNotes.value = "";
    el.reservationModal.classList.remove("hidden");
  }
  function closeModal() { el.reservationModal.classList.add("hidden"); }

  function confirmModal() {
    const rawDate = el.formDate.value.trim(); const name = el.formName.value.trim();
    if (!rawDate || !name) { alert("Preencha data e nome."); return; }
    const iso = rawDate.includes("-") ? rawDate : isoFromDMY(rawDate);
    if (!iso) { alert("Data inválida."); return; }
    const id = Date.now();
    state.reservations.push({ id, dateISO: iso, name, phone: el.formPhone.value.trim(), type: el.formType.value.trim(), notes: el.formNotes.value.trim() });
    const dt = new Date(iso); const md = getMonthData(dt); md[iso] = { status: "booked" };
    saveData(); closeModal(); render();
  }

  // Backup/import removidos junto das ferramentas visuais

  function searchAvailability() {
    const raw = el.searchDate.value.trim();
    const iso = raw.includes("-") ? raw : isoFromDMY(raw);
    if (!iso) { el.searchResult.textContent = "Informe a data no formato dd/mm/aaaa."; return; }

    const md = getMonthData(new Date(iso));
    const entry = md[iso];
    const reservation = state.reservations.find(r => r.dateISO === iso);
    const status = reservation ? "booked" : entry?.status || (isPastDate(iso) ? "past" : "available");

    if (status === "booked" && reservation) {
      el.searchResult.innerHTML = `
        <div class="alert alert-danger">
          <h4>Data já reservada</h4>
          <p><strong>Dados:</strong> ${formatLongDate(iso)}</p>
          <p><strong>Cliente:</strong> ${reservation.name || "-"}</p>
          <p><strong>Telefone:</strong> ${reservation.phone || "-"}</p>
          <p><strong>Tipo:</strong> ${reservation.type || "-"}</p>
          <p><strong>Observações:</strong> ${reservation.notes || "-"}</p>
        </div>`;
      return;
    }

    if (status === "booked") {
      el.searchResult.innerHTML = `
        <div class="alert alert-danger">
          <h4>Data já reservada</h4>
          <p><strong>Dados:</strong> ${formatLongDate(iso)}</p>
        </div>`;
      return;
    }

    el.searchResult.innerHTML = `
      <div class="alert alert-success">
        <h4>Dados disponíveis!</h4>
        <p>${formatLongDate(iso)} está livre para reserva.</p>
      </div>`;
  }

  // Events
  el.prevMonth.addEventListener("click", () => { state.current.setMonth(state.current.getMonth() - 1); render(); });
  el.nextMonth.addEventListener("click", () => { state.current.setMonth(state.current.getMonth() + 1); render(); });
  el.searchBtn.addEventListener("click", searchAvailability);
  el.openNewReservation.addEventListener("click", () => openModal());
  el.closeModal.addEventListener("click", closeModal);
  el.cancelModal.addEventListener("click", closeModal);
  el.confirmReservation.addEventListener("click", confirmModal);

  // Initial render
  closeModal();
  render();
})();


/*
 * My Car Companion
 * Main application controller
 */

const DEFAULT_VEHICLE = {
  id: "my-vehicle",
  make: "Toyota",
  model: "Corolla Cross Hybrid",
  year: 2021,
  odometer: 15600,
  registration: "",
  engine: "Hybrid",
  fuelType: "Petrol",
  lastUpdated: new Date().toISOString()
};

let currentPage = "home";

/* Helpers */

const $ = (selector) => document.querySelector(selector);

const formatMoney = (amount) =>
  "৳" + Number(amount || 0).toLocaleString("en-BD");

const formatNumber = (number) =>
  Number(number || 0).toLocaleString("en-BD");

const formatDate = (date) => {
  if (!date) return "Not specified";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);

function showMessage(message) {
  let toast = $("#toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.cssText = `
      position:fixed;
      bottom:100px;
      left:50%;
      transform:translateX(-50%);
      background:#20c997;
      color:#06271e;
      padding:12px 20px;
      border-radius:12px;
      font-size:13px;
      font-weight:700;
      z-index:9999;
      max-width:90%;
      text-align:center;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.display = "block";

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 2500);
}

/* Navigation */

function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll(".page").forEach((element) => {
    element.classList.toggle(
      "active",
      element.id === `page-${page}`
    );
  });

  document.querySelectorAll(".nav-item").forEach((element) => {
    element.classList.toggle(
      "active",
      element.dataset.page === page
    );
  });

  const titles = {
    home: "My Car Companion",
    service: "Maintenance",
    fuel: "Fuel Log",
    expenses: "Expenses",
    more: "More"
  };

  const heading = $("#page-title");

  if (heading) {
    heading.textContent = titles[page] || "My Car Companion";
  }

  renderCurrentPage();
}

async function renderCurrentPage() {
  try {
    if (currentPage === "home") await renderDashboard();
    if (currentPage === "service") await renderMaintenance();
    if (currentPage === "fuel") await renderFuel();
    if (currentPage === "expenses") await renderExpenses();
    if (currentPage === "more") await renderReminders();
  } catch (error) {
    console.error(error);
    showMessage("Unable to load data");
  }
}

/* Dashboard */

async function renderDashboard() {
  const vehicle = await getVehicle() || DEFAULT_VEHICLE;
  const services = await getMaintenanceRecords();
  const fuels = await getFuelRecords();
  const expenses = await getExpenseRecords();
  const reminders = await getReminders();

  const mileage = $("#dashboard-mileage");
  if (mileage) {
    mileage.textContent =
      formatNumber(vehicle.odometer) + " km";
  }

  const serviceCount = $("#dashboard-services");
  if (serviceCount) {
    serviceCount.textContent = services.length;
  }

  const fuelCount = $("#dashboard-fuel");
  if (fuelCount) {
    fuelCount.textContent = fuels.length;
  }

  const totalExpenses = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const expenseElement = $("#dashboard-expenses");
  if (expenseElement) {
    expenseElement.textContent = formatMoney(totalExpenses);
  }

  const reminderElement = $("#dashboard-reminders");
  if (reminderElement) {
    reminderElement.textContent = reminders.length;
  }

  const vehicleName = $("#vehicle-name");
  if (vehicleName) {
    vehicleName.textContent =
      `${vehicle.make || "Toyota"} ${vehicle.model || ""}`;
  }

  const vehicleYear = $("#vehicle-year");
  if (vehicleYear) {
    vehicleYear.textContent = vehicle.year || "";
  }

  const recent = $("#recent-activity");

  if (recent) {
    const activities = [
      ...services.map(item => ({
        title: item.type || "Maintenance",
        detail: formatDate(item.date),
        amount: item.amount,
        icon: "🔧",
        date: item.date
      })),
      ...fuels.map(item => ({
        title: "Fuel refill",
        detail: formatDate(item.date),
        amount: item.amount,
        icon: "⛽",
        date: item.date
      })),
      ...expenses.map(item => ({
        title: item.category || "Expense",
        detail: formatDate(item.date),
        amount: item.amount,
        icon: "💳",
        date: item.date
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    recent.innerHTML = activities.length
      ? activities.map(item => `
        <div class="list-item">
          <div class="list-icon">${item.icon}</div>
          <div class="list-content">
            <strong>${escapeHTML(item.title)}</strong>
            <small>${escapeHTML(item.detail)}</small>
          </div>
          <div class="list-value">
            ${formatMoney(item.amount)}
          </div>
        </div>
      `).join("")
      : `<div class="empty-state">
          <div class="empty-icon">🚗</div>
          No activity recorded yet
        </div>`;
  }
}

/* Maintenance */

async function renderMaintenance() {
  const records = await getMaintenanceRecords();
  const container = $("#maintenance-list");

  if (!container) return;

  const sorted = records.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  container.innerHTML = sorted.length
    ? sorted.map(item => `
      <div class="card">
        <div class="list-item">
          <div class="list-icon">🔧</div>
          <div class="list-content">
            <strong>${escapeHTML(item.type)}</strong>
            <small>${formatDate(item.date)}</small>
            <small>${formatNumber(item.odometer)} km</small>
            ${item.notes ? `<small>${escapeHTML(item.notes)}</small>` : ""}
          </div>
          <div class="list-value">
            ${formatMoney(item.amount)}
            <br>
            <button class="text-button"
              onclick="removeMaintenance('${item.id}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join("")
    : `<div class="empty-state">
        <div class="empty-icon">🔧</div>
        No maintenance records yet
      </div>`;
}

async function addMaintenance(event) {
  event.preventDefault();

  const record = {
    type: $("#maintenance-type")?.value,
    date: $("#maintenance-date")?.value,
    odometer: Number($("#maintenance-odometer")?.value || 0),
    amount: Number($("#maintenance-amount")?.value || 0),
    notes: $("#maintenance-notes")?.value || ""
  };

  if (!record.type || !record.date) {
    showMessage("Please enter service type and date");
    return;
  }

  await saveMaintenance(record);

  event.target.reset();
  showMessage("Maintenance record saved");
  await renderMaintenance();
}

async function removeMaintenance(id) {
  if (!confirm("Delete this maintenance record?")) return;

  await deleteMaintenance(id);
  showMessage("Record deleted");
  await renderMaintenance();
}

/* Fuel */

async function renderFuel() {
  const records = await getFuelRecords();
  const container = $("#fuel-list");

  if (!container) return;

  const sorted = records.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  container.innerHTML = sorted.length
    ? sorted.map(item => `
      <div class="card">
        <div class="list-item">
          <div class="list-icon">⛽</div>
          <div class="list-content">
            <strong>${formatNumber(item.liters)} litres</strong>
            <small>${formatDate(item.date)}</small>
            <small>${formatNumber(item.odometer)} km</small>
            <small>${escapeHTML(item.fuelType || "Petrol")}</small>
          </div>
          <div class="list-value">
            ${formatMoney(item.amount)}
            <br>
            <button class="text-button"
              onclick="removeFuel('${item.id}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join("")
    : `<div class="empty-state">
        <div class="empty-icon">⛽</div>
        No fuel records yet
      </div>`;

  renderFuelEconomy(records);
}

function renderFuelEconomy(records) {
  const element = $("#fuel-economy");
  if (!element) return;

  const sorted = [...records].sort(
    (a, b) => Number(a.odometer) - Number(b.odometer)
  );

  const fullTanks = sorted.filter(item => item.fullTank);

  if (fullTanks.length < 2) {
    element.textContent =
      "Record at least two consecutive full-tank refills to calculate fuel economy.";
    return;
  }

  const first = fullTanks[0];
  const last = fullTanks[fullTanks.length - 1];

  const distance =
    Number(last.odometer) - Number(first.odometer);

  const liters = fullTanks
    .slice(1)
    .reduce((sum, item) => sum + Number(item.liters || 0), 0);

  if (distance <= 0 || liters <= 0) {
    element.textContent = "More fuel records are needed.";
    return;
  }

  const economy = distance / liters;

  element.textContent =
    `${economy.toFixed(2)} km/L (estimated)`;
}

async function addFuel(event) {
  event.preventDefault();

  const record = {
    date: $("#fuel-date")?.value,
    odometer: Number($("#fuel-odometer")?.value || 0),
    liters: Number($("#fuel-liters")?.value || 0),
    amount: Number($("#fuel-amount")?.value || 0),
    fuelType: $("#fuel-type")?.value || "Petrol",
    fullTank: $("#fuel-full-tank")?.checked || false
  };

  if (!record.date || record.liters <= 0 || record.amount <= 0) {
    showMessage("Please enter valid fuel details");
    return;
  }

  await saveFuel(record);

  event.target.reset();
  showMessage("Fuel record saved");
  await renderFuel();
}

async function removeFuel(id) {
  if (!confirm("Delete this fuel record?")) return;

  await deleteFuel(id);
  showMessage("Fuel record deleted");
  await renderFuel();
}

/* Expenses */

async function renderExpenses() {
  const records = await getExpenseRecords();
  const container = $("#expense-list");

  if (!container) return;

  const total = records.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalElement = $("#total-expenses");
  if (totalElement) {
    totalElement.textContent = formatMoney(total);
  }

  const sorted = records.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  container.innerHTML = sorted.length
    ? sorted.map(item => `
      <div class="card">
        <div class="list-item">
          <div class="list-icon">💳</div>
          <div class="list-content">
            <strong>${escapeHTML(item.category)}</strong>
            <small>${formatDate(item.date)}</small>
            ${item.notes ? `<small>${escapeHTML(item.notes)}</small>` : ""}
          </div>
          <div class="list-value">
            ${formatMoney(item.amount)}
            <br>
            <button class="text-button"
              onclick="removeExpense('${item.id}')">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join("")
    : `<div class="empty-state">
        <div class="empty-icon">💳</div>
        No expenses recorded
      </div>`;
}

async function addExpense(event) {
  event.preventDefault();

  const record = {
    category: $("#expense-category")?.value,
    date: $("#expense-date")?.value,
    amount: Number($("#expense-amount")?.value || 0),
    notes: $("#expense-notes")?.value || ""
  };

  if (!record.category || !record.date || record.amount <= 0) {
    showMessage("Please enter valid expense details");
    return;
  }

  await saveExpense(record);

  event.target.reset();
  showMessage("Expense saved");
  await renderExpenses();
}

async function removeExpense(id) {
  if (!confirm("Delete this expense?")) return;

  await deleteExpense(id);
  showMessage("Expense deleted");
  await renderExpenses();
}

/* Reminders */

async function renderReminders() {
  const records = await getReminders();
  const container = $("#reminder-list");

  if (!container) return;

  const sorted = records.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  container.innerHTML = sorted.length
    ? sorted.map(item => {
      const overdue = new Date(item.date) < new Date();

      return `
        <div class="card">
          <div class="list-item">
            <div class="list-icon">🔔</div>
            <div class="list-content">
              <strong>${escapeHTML(item.title)}</strong>
              <small>${formatDate(item.date)}</small>
              <span class="badge ${overdue ? "danger" : "success"}">
                ${overdue ? "Overdue" : "Upcoming"}
              </span>
            </div>
            <button class="text-button"
              onclick="removeReminder('${item.id}')">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join("")
    : `<div class="empty-state">
        <div class="empty-icon">🔔</div>
        No reminders yet
      </div>`;
}

async function addReminder(event) {
  event.preventDefault();

  const record = {
    title: $("#reminder-title")?.value,
    date: $("#reminder-date")?.value,
    notes: $("#reminder-notes")?.value || ""
  };

  if (!record.title || !record.date) {
    showMessage("Please enter reminder title and date");
    return;
  }

  await saveReminder(record);

  event.target.reset();
  showMessage("Reminder saved");
  await renderReminders();
}

async function removeReminder(id) {
  if (!confirm("Delete this reminder?")) return;

  await deleteReminder(id);
  showMessage("Reminder deleted");
  await renderReminders();
}

/* Backup and restore */

async function backupData() {
  try {
    const backup = await exportDatabase();

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `my-car-companion-backup-${new Date()
      .toISOString().slice(0, 10)}.json`;

    link.click();

    URL.revokeObjectURL(url);
    showMessage("Backup downloaded");
  } catch (error) {
    console.error(error);
    showMessage("Backup failed");
  }
}

async function restoreData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!confirm("Restore this backup into the app?")) return;

    await importDatabase(backup);

    showMessage("Backup restored");
    await renderCurrentPage();
  } catch (error) {
    console.error(error);
    showMessage("Invalid backup file");
  }

  event.target.value = "";
}

/* Theme */

function toggleTheme() {
  document.body.classList.toggle("light-theme");

  const isLight = document.body.classList.contains("light-theme");

  localStorage.setItem(
    "myCarTheme",
    isLight ? "light" : "dark"
  );
}

function loadTheme() {
  if (localStorage.getItem("myCarTheme") === "light") {
    document.body.classList.add("light-theme");
  }
}

/* Vehicle profile */

async function initializeVehicle() {
  const existing = await getVehicle();

  if (!existing) {
    await saveVehicle(DEFAULT_VEHICLE);
  }
}

/* Connect forms and navigation */

function connectApplication() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      navigateTo(button.dataset.page);
    });
  });

  $("#maintenance-form")?.addEventListener("submit", addMaintenance);
  $("#fuel-form")?.addEventListener("submit", addFuel);
  $("#expense-form")?.addEventListener("submit", addExpense);
  $("#reminder-form")?.addEventListener("submit", addReminder);

  $("#backup-button")?.addEventListener("click", backupData);
  $("#restore-file")?.addEventListener("change", restoreData);
  $("#theme-button")?.addEventListener("click", toggleTheme);
}

/* Start application */

async function startApp() {
  try {
    loadTheme();

    await openDatabase();
    await initializeVehicle();

    connectApplication();

    await navigateTo("home");

    console.log("My Car Companion started successfully");
  } catch (error) {
    console.error("Application startup failed:", error);
    showMessage("App startup failed. Check database.js");
  }
}

document.addEventListener("DOMContentLoaded", startApp);

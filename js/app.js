
/* My Car Companion - Main Application */

const DEFAULT_VEHICLE = {
  id: "my-vehicle",
  make: "Toyota",
  model: "Corolla Cross Hybrid",
  year: 2021,
  odometer: 15600,
  registration: "",
  vin: "",
  notes: ""
};

const $ = id => document.getElementById(id);

const money = value =>
  "৳" + Number(value || 0).toLocaleString("en-BD");

const number = value =>
  Number(value || 0).toLocaleString("en-BD");

const dateText = value => {
  if (!value) return "Date not set";
  return new Date(value + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const safe = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);

function notify(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function today() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString().slice(0, 10);
}

/* NAVIGATION */

function navigate(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  renderPage(page);
}

async function renderPage(page) {
  if (page === "dashboard") await renderDashboard();
  if (page === "maintenance") await renderMaintenance();
  if (page === "fuel") await renderFuel();
  if (page === "expenses") await renderExpenses();
  if (page === "reminders") await renderReminders();
  if (page === "settings") await renderVehicle();
}

/* DASHBOARD */

async function renderDashboard() {
  const vehicle = await getVehicle() || DEFAULT_VEHICLE;
  const services = await getMaintenanceRecords();
  const fuels = await getFuelRecords();
  const expenses = await getExpenseRecords();
  const reminders = await getReminders();

  $("vehicleTitle").textContent =
    `${vehicle.make} ${vehicle.model}`;

  $("vehicleSubtitle").textContent =
    `${vehicle.year} · ${vehicle.engine || "Hybrid"}`;

  $("dashOdometer").textContent =
    `${number(vehicle.odometer)} km`;

  const maintenanceTotal = services.reduce(
    (sum, item) => sum + Number(item.amount || 0), 0
  );

  const fuelTotal = fuels.reduce(
    (sum, item) => sum + Number(item.amount || 0), 0
  );

  const otherTotal = expenses
    .filter(item => !["Fuel", "Maintenance"].includes(item.category))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  $("dashMaintenance").textContent = money(maintenanceTotal);
  $("dashFuel").textContent = money(fuelTotal);
  $("dashOther").textContent = money(otherTotal);

  const upcoming = reminders.filter(item => !item.completed);
  $("dashReminders").textContent = upcoming.length;

  const economy = calculateEconomy(fuels);
  $("dashEconomy").textContent =
    economy ? `${economy.toFixed(2)} km/L` : "— km/L";

  const activity = [
    ...services.map(item => ({
      title: item.title,
      date: item.date,
      amount: item.amount,
      icon: "🔧"
    })),
    ...fuels.map(item => ({
      title: "Fuel refill",
      date: item.date,
      amount: item.amount,
      icon: "⛽"
    })),
    ...expenses.map(item => ({
      title: item.title,
      date: item.date,
      amount: item.amount,
      icon: "🧾"
    }))
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  $("recentList").classList.toggle("empty-state", !activity.length);

  $("recentList").innerHTML = activity.length
    ? activity.map(item => `
      <div class="record-item">
        <span>${item.icon}</span>
        <div>
          <strong>${safe(item.title)}</strong>
          <small>${dateText(item.date)}</small>
        </div>
        <strong>${money(item.amount)}</strong>
      </div>
    `).join("")
    : "Your records will appear here.";
}

/* MAINTENANCE */

async function renderMaintenance() {
  const records = (await getMaintenanceRecords())
    .sort((a, b) => b.date.localeCompare(a.date));

  $("maintenanceCount").textContent =
    `${records.length} records`;

  $("maintenanceList").classList.toggle(
    "empty-state", !records.length
  );

  $("maintenanceList").innerHTML = records.length
    ? records.map(item => `
      <article class="record-card">
        <div class="record-heading">
          <strong>${safe(item.title)}</strong>
          <strong>${money(item.amount)}</strong>
        </div>
        <p>${safe(item.category)} · ${dateText(item.date)}</p>
        <p>${number(item.odometer)} km</p>
        ${item.notes ? `<p>${safe(item.notes)}</p>` : ""}
        <button class="delete-btn"
          data-delete="maintenance"
          data-id="${safe(item.id)}">Delete</button>
      </article>
    `).join("")
    : "No maintenance records yet.";
}

async function addMaintenance(event) {
  event.preventDefault();

  const data = formData(event.target);

  const record = {
    title: data.title,
    type: data.category,
    category: data.category,
    date: data.date,
    odometer: Number(data.odometer),
    partsCost: Number(data.partsCost || 0),
    labourCost: Number(data.labourCost || 0),
    amount: Number(data.partsCost || 0) +
      Number(data.labourCost || 0),
    notes: data.notes || ""
  };

  await saveMaintenance(record);
  event.target.reset();

  notify("Maintenance record saved");
  await renderMaintenance();
  await renderDashboard();
}

/* FUEL */

function calculateEconomy(records) {
  const fullTanks = [...records]
    .filter(item => item.fullTank)
    .sort((a, b) => Number(a.odometer) - Number(b.odometer));

  if (fullTanks.length < 2) return null;

  const previous = fullTanks[fullTanks.length - 2];
  const latest = fullTanks[fullTanks.length - 1];

  const distance =
    Number(latest.odometer) - Number(previous.odometer);

  const litres = records
    .filter(item =>
      Number(item.odometer) > Number(previous.odometer) &&
      Number(item.odometer) <= Number(latest.odometer)
    )
    .reduce((sum, item) => sum + Number(item.litres || 0), 0);

  return distance > 0 && litres > 0
    ? distance / litres
    : null;
}

async function renderFuel() {
  const records = (await getFuelRecords())
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = records.reduce(
    (sum, item) => sum + Number(item.amount || 0), 0
  );

  const economy = calculateEconomy(records);

  $("fuelTotal").textContent = money(total);
  $("fuelEconomy").textContent =
    economy ? `${economy.toFixed(2)} km/L` : "— km/L";

  $("fuelCount").textContent = `${records.length} records`;

  $("fuelList").classList.toggle("empty-state", !records.length);

  $("fuelList").innerHTML = records.length
    ? records.map(item => `
      <article class="record-card">
        <div class="record-heading">
          <strong>${number(item.litres)} litres</strong>
          <strong>${money(item.amount)}</strong>
        </div>
        <p>${dateText(item.date)} · ${number(item.odometer)} km</p>
        <p>${item.fullTank ? "Full tank" : "Partial refill"}</p>
        ${item.notes ? `<p>${safe(item.notes)}</p>` : ""}
        <button class="delete-btn"
          data-delete="fuel"
          data-id="${safe(item.id)}">Delete</button>
      </article>
    `).join("")
    : "No fuel records yet.";
}

async function addFuel(event) {
  event.preventDefault();

  const data = formData(event.target);

  const record = {
    date: data.date,
    odometer: Number(data.odometer),
    litres: Number(data.litres),
    amount: Number(data.amount),
    fullTank: event.target.elements.fullTank.checked,
    notes: data.notes || ""
  };

  if (record.litres <= 0 || record.amount <= 0) {
    notify("Enter valid fuel details");
    return;
  }

  await saveFuel(record);
  event.target.reset();

  notify("Fuel record saved");
  await renderFuel();
  await renderDashboard();
}

/* EXPENSES */

async function renderExpenses() {
  const records = (await getExpenseRecords())
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = records.reduce(
    (sum, item) => sum + Number(item.amount || 0), 0
  );

  $("expenseTotal").textContent = money(total);
  $("expenseCount").textContent = `${records.length} records`;

  $("expenseList").classList.toggle("empty-state", !records.length);

  $("expenseList").innerHTML = records.length
    ? records.map(item => `
      <article class="record-card">
        <div class="record-heading">
          <strong>${safe(item.title)}</strong>
          <strong>${money(item.amount)}</strong>
        </div>
        <p>${safe(item.category)} · ${dateText(item.date)}</p>
        ${item.notes ? `<p>${safe(item.notes)}</p>` : ""}
        <button class="delete-btn"
          data-delete="expenses"
          data-id="${safe(item.id)}">Delete</button>
      </article>
    `).join("")
    : "No expenses yet.";
}

async function addExpense(event) {
  event.preventDefault();

  const data = formData(event.target);

  const record = {
    title: data.title,
    date: data.date,
    category: data.category,
    amount: Number(data.amount),
    notes: data.notes || ""
  };

  if (record.amount <= 0) {
    notify("Enter a valid amount");
    return;
  }

  await saveExpense(record);
  event.target.reset();

  notify("Expense saved");
  await renderExpenses();
  await renderDashboard();
}

/* REMINDERS */

async function renderReminders() {
  const records = (await getReminders())
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  $("reminderList").classList.toggle("empty-state", !records.length);

  $("reminderList").innerHTML = records.length
    ? records.map(item => {
      const overdue = item.dueDate &&
        item.dueDate < today() &&
        !item.completed;

      return `
        <article class="record-card">
          <div class="record-heading">
            <strong>${safe(item.title)}</strong>
            <span>${overdue ? "Overdue" : item.completed ? "Completed" : "Upcoming"}</span>
          </div>
          ${item.dueDate ? `<p>Due: ${dateText(item.dueDate)}</p>` : ""}
          ${item.dueOdometer ? `<p>Due at: ${number(item.dueOdometer)} km</p>` : ""}
          ${item.notes ? `<p>${safe(item.notes)}</p>` : ""}
          <button class="delete-btn"
            data-delete="reminders"
            data-id="${safe(item.id)}">Delete</button>
        </article>
      `;
    }).join("")
    : "No reminders yet.";
}

async function addReminder(event) {
  event.preventDefault();

  const data = formData(event.target);

  if (!data.dueDate && !data.dueOdometer) {
    notify("Set a due date or odometer reading");
    return;
  }

  await saveReminder({
    title: data.title,
    dueDate: data.dueDate || "",
    dueOdometer: Number(data.dueOdometer || 0),
    notes: data.notes || "",
    completed: false
  });

  event.target.reset();

  notify("Reminder saved");
  await renderReminders();
  await renderDashboard();
}

/* VEHICLE SETTINGS */

async function renderVehicle() {
  const vehicle = await getVehicle() || DEFAULT_VEHICLE;
  const form = $("vehicleForm");

  for (const [key, value] of Object.entries(vehicle)) {
    if (form.elements[key]) {
      form.elements[key].value = value ?? "";
    }
  }
}

async function saveVehicleForm(event) {
  event.preventDefault();

  const data = formData(event.target);

  await saveVehicle({
    id: "my-vehicle",
    make: data.make,
    model: data.model,
    year: Number(data.year),
    odometer: Number(data.odometer),
    registration: data.registration || "",
    vin: data.vin || "",
    notes: data.notes || ""
  });

  notify("Vehicle profile saved");
  await renderDashboard();
}

/* BACKUP AND RESTORE */

async function exportBackup() {
  try {
    const backup = await exportDatabase();

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `my-car-companion-${today()}.json`;
    link.click();

    URL.revokeObjectURL(url);
    $("backupStatus").textContent = "Backup exported successfully.";
  } catch (error) {
    console.error(error);
    $("backupStatus").textContent = "Backup failed.";
  }
}

async function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());

    if (!backup.data) throw new Error("Invalid backup");

    if (!confirm("Restore backup data?")) return;

    await importDatabase(backup);

    notify("Backup restored");
    $("backupStatus").textContent = "Backup restored successfully.";

    await renderPage("settings");
    await renderDashboard();
  } catch (error) {
    console.error(error);
    notify("Invalid backup file");
  }

  event.target.value = "";
}

/* DELETE RECORDS */

async function deleteItem(store, id) {
  if (!confirm("Delete this record?")) return;

  const functions = {
    maintenance: deleteMaintenance,
    fuel: deleteFuel,
    expenses: deleteExpense,
    reminders: deleteReminder
  };

  await functions[store](id);

  notify("Record deleted");
  await renderPage(
    store === "maintenance" ? "maintenance" : store
  );
  await renderDashboard();
}

async function clearAllData() {
  if (!confirm("Permanently delete all app records?")) return;
  if (!confirm("Are you sure? Export a backup first if needed.")) return;

  const db = await openDatabase();

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(
      Object.values(STORES), "readwrite"
    );

    Object.values(STORES).forEach(name => {
      transaction.objectStore(name).clear();
    });

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });

  await initializeVehicle();

  notify("All records deleted");
  await renderDashboard();
  await renderVehicle();
}

/* THEME */

function toggleTheme() {
  document.body.classList.toggle("light-theme");

  const theme = document.body.classList.contains("light-theme")
    ? "light"
    : "dark";

  localStorage.setItem("myCarTheme", theme);
}

function loadTheme() {
  if (localStorage.getItem("myCarTheme") === "light") {
    document.body.classList.add("light-theme");
  }
}

/* EVENT CONNECTIONS */

function connectEvents() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      navigate(button.dataset.page);
    });
  });

  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
      navigate(button.dataset.go);
    });
  });

  $("maintenanceForm").addEventListener("submit", addMaintenance);
  $("fuelForm").addEventListener("submit", addFuel);
  $("expenseForm").addEventListener("submit", addExpense);
  $("reminderForm").addEventListener("submit", addReminder);
  $("vehicleForm").addEventListener("submit", saveVehicleForm);

  $("themeToggle").addEventListener("click", toggleTheme);
  $("exportBtn").addEventListener("click", exportBackup);

  $("importBtn").addEventListener("click", () => {
    $("importFile").click();
  });

  $("importFile").addEventListener("change", importBackup);
  $("clearDataBtn").addEventListener("click", clearAllData);

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;

    deleteItem(button.dataset.delete, button.dataset.id);
  });
}

/* APP START */

async function startApp() {
  try {
    loadTheme();
    await openDatabase();

    if (!await getVehicle()) {
      await saveVehicle(DEFAULT_VEHICLE);
    }

    connectEvents();

    document.querySelectorAll('input[type="date"]').forEach(input => {
      if (!input.value) input.value = today();
    });

    await navigate("dashboard");

    console.log("My Car Companion is ready");
  } catch (error) {
    console.error("Application startup error:", error);
    notify("App could not start. Check database.js");
  }
}

document.addEventListener("DOMContentLoaded", startApp);

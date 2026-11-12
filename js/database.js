
/*
 * My Car Companion
 * Local database using IndexedDB
 */

const DB_NAME = "MyCarCompanionDB";
const DB_VERSION = 1;

let dbInstance = null;

const STORES = {
  vehicle: "vehicle",
  maintenance: "maintenance",
  fuel: "fuel",
  expenses: "expenses",
  reminders: "reminders"
};

/* Open database */

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.vehicle)) {
        db.createObjectStore(STORES.vehicle, {
          keyPath: "id"
        });
      }

      if (!db.objectStoreNames.contains(STORES.maintenance)) {
        const store = db.createObjectStore(STORES.maintenance, {
          keyPath: "id"
        });
        store.createIndex("date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.fuel)) {
        const store = db.createObjectStore(STORES.fuel, {
          keyPath: "id"
        });
        store.createIndex("date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.expenses)) {
        const store = db.createObjectStore(STORES.expenses, {
          keyPath: "id"
        });
        store.createIndex("date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.reminders)) {
        const store = db.createObjectStore(STORES.reminders, {
          keyPath: "id"
        });
        store.createIndex("date", "date", { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* Generate unique ID */

function generateId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 9)
  );
}

/* Add or update a record */

async function saveRecord(storeName, record) {
  const db = await openDatabase();

  const data = {
    ...record,
    id: record.id || generateId(),
    updatedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/* Get all records */

async function getAllRecords(storeName) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/* Get one record */

async function getRecord(storeName, id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/* Delete a record */

async function deleteRecord(storeName, id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/* Save vehicle profile */

async function saveVehicle(vehicle) {
  return saveRecord(STORES.vehicle, {
    ...vehicle,
    id: "my-vehicle"
  });
}

/* Get vehicle profile */

async function getVehicle() {
  return getRecord(STORES.vehicle, "my-vehicle");
}

/* Maintenance */

async function saveMaintenance(record) {
  return saveRecord(STORES.maintenance, record);
}

async function getMaintenanceRecords() {
  return getAllRecords(STORES.maintenance);
}

async function deleteMaintenance(id) {
  return deleteRecord(STORES.maintenance, id);
}

/* Fuel */

async function saveFuel(record) {
  return saveRecord(STORES.fuel, record);
}

async function getFuelRecords() {
  return getAllRecords(STORES.fuel);
}

async function deleteFuel(id) {
  return deleteRecord(STORES.fuel, id);
}

/* Expenses */

async function saveExpense(record) {
  return saveRecord(STORES.expenses, record);
}

async function getExpenseRecords() {
  return getAllRecords(STORES.expenses);
}

async function deleteExpense(id) {
  return deleteRecord(STORES.expenses, id);
}

/* Reminders */

async function saveReminder(record) {
  return saveRecord(STORES.reminders, record);
}

async function getReminders() {
  return getAllRecords(STORES.reminders);
}

async function deleteReminder(id) {
  return deleteRecord(STORES.reminders, id);
}

/* Export all data */

async function exportDatabase() {
  const data = {};

  for (const [key, storeName] of Object.entries(STORES)) {
    data[key] = await getAllRecords(storeName);
  }

  return {
    app: "My Car Companion",
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
}

/* Import backup */

async function importDatabase(backup) {
  if (!backup || !backup.data) {
    throw new Error("Invalid backup file");
  }

  for (const [key, storeName] of Object.entries(STORES)) {
    const records = backup.data[key] || [];

    for (const record of records) {
      await saveRecord(storeName, record);
    }
  }

  return true;
}

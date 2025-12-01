"use strict";
const worker_threads = require("worker_threads");
const Database = require("better-sqlite3");
if (!worker_threads.parentPort) throw new Error("Must be run as a worker thread");
let db = null;
const { dbPath } = worker_threads.workerData;
try {
  db = new Database(dbPath, { verbose: console.log });
  db.pragma("journal_mode = WAL");
  console.log("Worker: Database connected at", dbPath);
} catch (err) {
  console.error("Worker: Failed to connect to DB", err);
  process.exit(1);
}
worker_threads.parentPort.on("message", (message) => {
  if (!db) return;
  const { id, type, sql, params } = message;
  try {
    let result;
    const stmt = db.prepare(sql);
    if (type === "run") {
      result = stmt.run(...params || []);
    } else if (type === "get") {
      result = stmt.get(...params || []);
    } else if (type === "all") {
      result = stmt.all(...params || []);
    } else if (type === "exec") {
      result = db.exec(sql);
    } else if (type === "transaction") {
      throw new Error("Transaction via raw message not fully supported yet");
    }
    worker_threads.parentPort.postMessage({ id, status: "success", data: result });
  } catch (err) {
    console.error("Worker: Query failed", err);
    worker_threads.parentPort.postMessage({ id, status: "error", error: err.message });
  }
});

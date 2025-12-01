
import { parentPort, workerData } from 'worker_threads';
import Database from 'better-sqlite3';
import path from 'path';

if (!parentPort) throw new Error('Must be run as a worker thread');

let db: Database.Database | null = null;

const { dbPath } = workerData;

try {
    db = new Database(dbPath, { verbose: console.log });
    db.pragma('journal_mode = WAL');
    console.log('Worker: Database connected at', dbPath);
} catch (err) {
    console.error('Worker: Failed to connect to DB', err);
    process.exit(1);
}

parentPort.on('message', (message) => {
    if (!db) return;

    const { id, type, sql, params } = message;

    try {
        let result;
        const stmt = db.prepare(sql);

        if (type === 'run') {
            result = stmt.run(...(params || []));
        } else if (type === 'get') {
            result = stmt.get(...(params || []));
        } else if (type === 'all') {
            result = stmt.all(...(params || []));
        } else if (type === 'exec') {
            result = db.exec(sql);
        } else if (type === 'transaction') {
            // Handle transaction... this is tricky in a stateless worker msg
            // For now, we might need to pass a batch of queries
            // Or use a specific 'transaction' type that takes a list of operations
            // For simplicity in this first pass, we'll stick to atomic queries
            // Complex transactions might need to be moved logic-side into the worker
            throw new Error('Transaction via raw message not fully supported yet');
        }

        parentPort!.postMessage({ id, status: 'success', data: result });
    } catch (err) {
        console.error('Worker: Query failed', err);
        parentPort!.postMessage({ id, status: 'error', error: (err as Error).message });
    }
});

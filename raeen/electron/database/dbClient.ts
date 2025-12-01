
import { Worker } from 'worker_threads';
import path from 'path';
import { app } from 'electron';

// Helper to get DB path (same logic as original database/index.ts)
const getDbPath = () => {
    const isDev = !app.isPackaged;
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'launcher.db');
};

export class DatabaseWorkerClient {
    private worker: Worker;
    private pendingRequests: Map<string, { resolve: (value: any) => void, reject: (reason: any) => void }>;
    private static instance: DatabaseWorkerClient;

    private constructor() {
        this.pendingRequests = new Map();
        
        // In production, the worker file location might be different
        // We might need to adjust this path based on build structure
        // Fix for dev mode where we might be running from different context
        
        // In Vite Dev Mode:
        // __dirname points to `dist-electron` (because main.ts is compiled there)
        // The worker is compiled to `dist-electron/dbWorker.js` (based on vite.config.ts)
        
        let workerPath = path.join(__dirname, 'dbWorker.js'); 
        
        if (!app.isPackaged) {
            // In dev, if it fails, check if we need relative path
            // console.log('Worker path:', workerPath);
        }
        
        this.worker = new Worker(workerPath, {
            workerData: { dbPath: getDbPath() }
        });

        this.worker.on('message', (message) => {
            const { id, status, data, error } = message;
            const pending = this.pendingRequests.get(id);
            
            if (pending) {
                if (status === 'success') {
                    pending.resolve(data);
                } else {
                    pending.reject(new Error(error));
                }
                this.pendingRequests.delete(id);
            }
        });

        this.worker.on('error', (err) => {
            console.error('Worker error:', err);
        });
        
        this.worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
            }
        });
    }

    public static getInstance(): DatabaseWorkerClient {
        if (!DatabaseWorkerClient.instance) {
            DatabaseWorkerClient.instance = new DatabaseWorkerClient();
        }
        return DatabaseWorkerClient.instance;
    }

    private send(type: 'run' | 'get' | 'all' | 'exec', sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(7);
            this.pendingRequests.set(id, { resolve, reject });
            this.worker.postMessage({ id, type, sql, params });
        });
    }

    public async run(sql: string, ...params: any[]): Promise<any> {
        return this.send('run', sql, params);
    }

    public async get(sql: string, ...params: any[]): Promise<any> {
        return this.send('get', sql, params);
    }

    public async all(sql: string, ...params: any[]): Promise<any[]> {
        return this.send('all', sql, params);
    }

    public async exec(sql: string): Promise<void> {
        return this.send('exec', sql);
    }
}

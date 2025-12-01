
import { DatabaseWorkerClient } from '../electron/database/dbClient';
import path from 'path';
import { app } from 'electron';

// Mock app for standalone run
if (!app) {
    // Basic mock for app.getPath if running via tsx directly (though dbClient uses it)
    // Since we can't easily mock the internal require of dbClient without complex setup,
    // we rely on dbClient logic.
    // However, dbClient imports 'electron', which might fail in pure Node.
    // This script is best run via electron-runner or we just inspect the files.
}

async function testWorker() {
    console.log('Initializing DB Client...');
    // Note: This might fail if run with tsx due to 'electron' import in dbClient.
    // But let's try to see if we can instantiate it or if we need a mock.
    
    try {
        const client = DatabaseWorkerClient.getInstance();
        console.log('Client initialized. Sending test query...');
        
        const count = await client.get('SELECT COUNT(*) as c FROM games');
        console.log('Game Count:', count);
        
        const games = await client.all('SELECT title FROM games LIMIT 5');
        console.log('First 5 games:', games);
        
        process.exit(0);
    } catch (e) {
        console.error('Worker Test Failed:', e);
        process.exit(1);
    }
}

testWorker();

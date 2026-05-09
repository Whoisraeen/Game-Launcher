import { exec } from 'child_process';
import { promisify } from 'util';
import dns from 'dns';

const execAsync = promisify(exec);

export interface PingResult {
    host: string;
    label: string;
    ip: string;
    latency: number;      // ms, -1 if failed
    packetLoss: number;    // percentage
    status: 'good' | 'fair' | 'poor' | 'timeout';
}

export interface DnsInfo {
    currentServers: string[];
    recommended: { name: string; primary: string; secondary: string }[];
}

const PING_TARGETS = [
    { host: '8.8.8.8',         label: 'Google DNS' },
    { host: '1.1.1.1',         label: 'Cloudflare' },
    { host: '208.67.222.222',  label: 'OpenDNS' },
    { host: '76.76.2.0',       label: 'Control D' },
    { host: '9.9.9.9',         label: 'Quad9' },
    { host: '3.33.152.147',    label: 'AWS US-East' },
    { host: '13.225.183.84',   label: 'AWS EU' },
    { host: '52.58.0.0',       label: 'AWS EU-Central' },
];

export class NetworkService {

    async pingTest(): Promise<PingResult[]> {
        const results = await Promise.all(
            PING_TARGETS.map(t => this.pingSingle(t.host, t.label))
        );
        return results.sort((a, b) => {
            if (a.latency === -1) return 1;
            if (b.latency === -1) return -1;
            return a.latency - b.latency;
        });
    }

    private async pingSingle(host: string, label: string): Promise<PingResult> {
        try {
            const { stdout } = await execAsync(
                `ping -n 4 -w 2000 ${host}`,
                { timeout: 15000 }
            );

            const latencyMatch = stdout.match(/Average\s*=\s*(\d+)ms/i)
                               || stdout.match(/Moyenne\s*=\s*(\d+)ms/i)
                               || stdout.match(/Durchschnitt\s*=\s*(\d+)ms/i);
            const lossMatch   = stdout.match(/(\d+)%\s*(loss|perdus|verloren)/i);

            const latency    = latencyMatch ? parseInt(latencyMatch[1], 10) : -1;
            const packetLoss = lossMatch    ? parseInt(lossMatch[1], 10)    : 0;

            let status: PingResult['status'] = 'good';
            if (latency === -1 || packetLoss === 100) status = 'timeout';
            else if (latency > 100 || packetLoss > 25) status = 'poor';
            else if (latency > 50 || packetLoss > 0)  status = 'fair';

            return { host, label, ip: host, latency, packetLoss, status };
        } catch {
            return { host, label, ip: host, latency: -1, packetLoss: 100, status: 'timeout' };
        }
    }

    async flushDns(): Promise<{ success: boolean; output: string }> {
        try {
            const { stdout } = await execAsync('ipconfig /flushdns', { timeout: 10000 });
            return { success: true, output: stdout.trim() };
        } catch (error) {
            return { success: false, output: String(error) };
        }
    }

    async getDnsInfo(): Promise<DnsInfo> {
        let currentServers: string[] = [];
        try {
            currentServers = dns.getServers();
        } catch { /* ignore */ }

        if (currentServers.length === 0) {
            try {
                const { stdout } = await execAsync(
                    'powershell -NoProfile -Command "(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses | ConvertTo-Json"',
                    { timeout: 10000 }
                );
                const parsed = JSON.parse(stdout.trim());
                currentServers = Array.isArray(parsed) ? parsed : [parsed];
            } catch { /* ignore */ }
        }

        return {
            currentServers,
            recommended: [
                { name: 'Cloudflare',  primary: '1.1.1.1',       secondary: '1.0.0.1' },
                { name: 'Google DNS',  primary: '8.8.8.8',       secondary: '8.8.4.4' },
                { name: 'Quad9',       primary: '9.9.9.9',       secondary: '149.112.112.112' },
                { name: 'OpenDNS',     primary: '208.67.222.222', secondary: '208.67.220.220' },
                { name: 'Control D',   primary: '76.76.2.0',     secondary: '76.76.10.0' },
            ],
        };
    }
}

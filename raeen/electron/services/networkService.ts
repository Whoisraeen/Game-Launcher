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
            // BUG-041: don't depend on the OS-locale string of `ping`. Two safer paths:
            // (1) parse individual reply latencies via the locale-agnostic
            //     "time=Nms" / "time<1ms" / "Zeit=Nms" / "temps=Nms" tokens, or
            // (2) compute the average ourselves from those numbers — always works.
            const { stdout } = await execAsync(
                `ping -n 4 -w 2000 ${host}`,
                { timeout: 15000 }
            );

            // Match any of the common "time/Zeit/temps/tiempo = Nms" tokens.
            const replyLatencies: number[] = [];
            const replyRe = /(?:time|zeit|temps|tiempo|tempo)[<=]\s*(\d+)\s*ms/gi;
            let rm: RegExpExecArray | null;
            while ((rm = replyRe.exec(stdout)) !== null) {
                const v = parseInt(rm[1], 10);
                if (Number.isFinite(v)) replyLatencies.push(v);
            }
            const latency = replyLatencies.length
                ? Math.round(replyLatencies.reduce((a, b) => a + b, 0) / replyLatencies.length)
                : -1;

            // Packet loss: "(N% loss)" / "perdus" / "verloren" / "perdidos" — capture any.
            const lossMatch = stdout.match(/(\d+)\s*%\s*(loss|perdus|verloren|perdidos|perdita|失|遗|소실|줄|drop)/i);
            const packetLoss = lossMatch ? parseInt(lossMatch[1], 10) : (latency === -1 ? 100 : 0);

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

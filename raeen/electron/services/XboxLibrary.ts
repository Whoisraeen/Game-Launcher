import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface XboxGame {
    id: string;
    title: string;
    installPath: string;
    executable?: string; // Usually not accessible for UWP, but we need something
    pfn: string; // Package Family Name
}

export class XboxLibrary {

    async getInstalledGames(): Promise<XboxGame[]> {
        const games: XboxGame[] = [];

        try {
            // Use PowerShell to get installed Appx packages that are likely games
            // We filter by signature or known publishers if possible, but for now getting all non-system apps is a start
            // A better way is to look for specific capabilities or just get everything and filter by known game publishers?
            // Playnite uses a more complex method. Here we'll try a simple PowerShell command to get packages.
            // We look for packages that are not frameworks and have an installation location.

            const psCommand = `Get-AppxPackage -User $env:USERNAME | Where-Object {$_.IsFramework -eq $false -and $_.SignatureKind -eq 'Store'} | Select-Object Name, PackageFamilyName, InstallLocation, IsGame | ConvertTo-Json`;

            const { stdout } = await execAsync(`powershell -Command "${psCommand}"`, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer

            if (stdout.trim()) {
                let packages: any[] = [];
                try {
                    packages = JSON.parse(stdout);
                } catch {
                    // If single object, it might not be an array
                    try {
                        packages = [JSON.parse(stdout)];
                    } catch (e) {
                        console.error('Failed to parse PowerShell output for Xbox games');
                    }
                }

                if (!Array.isArray(packages)) packages = [packages];

                for (const pkg of packages) {
                    // Filter out obvious non-games if possible, or rely on user to hide them
                    // "IsGame" property is sometimes available in newer Windows versions
                    // Also filter out common system apps
                    if (this.isSystemApp(pkg.Name)) continue;

                    games.push({
                        id: pkg.PackageFamilyName,
                        title: pkg.Name,
                        installPath: pkg.InstallLocation,
                        pfn: pkg.PackageFamilyName,
                        executable: 'UWP' // Placeholder
                    });
                }
            }
        } catch (e) {
            console.error('Error scanning Xbox games:', e);
        }

        return games;
    }

    private isSystemApp(name: string): boolean {
        const systemApps = [
            'Microsoft.WindowsCalculator',
            'Microsoft.WindowsStore',
            'Microsoft.Windows.Photos',
            'Microsoft.WindowsCamera',
            'Microsoft.WindowsAlarms',
            'Microsoft.GetHelp',
            'Microsoft.MicrosoftEdge',
            'Microsoft.YourPhone',
            'Microsoft.ZuneMusic',
            'Microsoft.ZuneVideo',
            'Microsoft.SkypeApp',
            'Microsoft.Office.OneNote',
            'Microsoft.People',
            'Microsoft.WindowsMaps',
            'Microsoft.WindowsSoundRecorder',
            'Microsoft.XboxApp', // The app itself
            'Microsoft.XboxGamingOverlay',
            'Microsoft.XboxIdentityProvider',
            'Microsoft.XboxSpeechToTextOverlay',
        ];
        return systemApps.some(app => name.startsWith(app));
    }

    getLaunchCommand(pfn: string): string {
        return `shell:AppsFolder\\${pfn}!App`;
    }
}

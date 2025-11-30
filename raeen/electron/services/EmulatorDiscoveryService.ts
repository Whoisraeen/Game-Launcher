import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface DetectedEmulator {
    name: string;
    executable: string;
    defaultArgs: string;
    platforms: string[];
    extensions: string[];
}

export class EmulatorDiscoveryService {
    private knownEmulators: DetectedEmulator[] = [
        {
            name: 'RetroArch',
            executable: 'retroarch.exe',
            defaultArgs: '-L {core} {rom}',
            platforms: ['nes', 'snes', 'gba', 'n64', 'ps1', 'sega'],
            extensions: ['.nes', '.sfc', '.smc', '.gba', '.gbc', '.n64', '.z64', '.cue', '.iso', '.chd', '.md']
        },
        {
            name: 'Dolphin',
            executable: 'Dolphin.exe',
            defaultArgs: '-b -e {rom}',
            platforms: ['gc', 'wii'],
            extensions: ['.iso', '.gcz', '.wbfs', '.rvz', '.ciso']
        },
        {
            name: 'PCSX2',
            executable: 'pcsx2.exe',
            defaultArgs: '{rom}',
            platforms: ['ps2'],
            extensions: ['.iso', '.bin', '.gz', '.cso']
        },
        {
            name: 'RPCS3',
            executable: 'rpcs3.exe',
            defaultArgs: '{rom}',
            platforms: ['ps3'],
            extensions: ['.iso', '.pkg']
        },
        {
            name: 'Cemu',
            executable: 'Cemu.exe',
            defaultArgs: '-g {rom}',
            platforms: ['wiiu'],
            extensions: ['.rpx', '.wud', '.wux']
        },
        {
            name: 'Yuzu',
            executable: 'yuzu.exe',
            defaultArgs: '-g {rom}',
            platforms: ['switch'],
            extensions: ['.nsp', '.xci']
        },
        {
            name: 'Ryujinx',
            executable: 'Ryujinx.exe',
            defaultArgs: '{rom}',
            platforms: ['switch'],
            extensions: ['.nsp', '.xci']
        },
        {
            name: 'DuckStation',
            executable: 'duckstation-qt-x64-ReleaseLTCG.exe',
            defaultArgs: '{rom}',
            platforms: ['ps1'],
            extensions: ['.cue', '.iso', '.chd', '.m3u']
        },
         {
            name: 'DuckStation (NoGui)',
            executable: 'duckstation-nogui-x64-ReleaseLTCG.exe',
            defaultArgs: '{rom}',
            platforms: ['ps1'],
            extensions: ['.cue', '.iso', '.chd', '.m3u']
        },
        {
            name: 'PPSSPP',
            executable: 'PPSSPPWindows64.exe',
            defaultArgs: '{rom}',
            platforms: ['psp'],
            extensions: ['.iso', '.cso']
        },
        {
            name: 'DeSmuME',
            executable: 'DeSmuME.exe',
            defaultArgs: '{rom}',
            platforms: ['nds'],
            extensions: ['.nds']
        },
        {
            name: 'MelonDS',
            executable: 'melonDS.exe',
            defaultArgs: '{rom}',
            platforms: ['nds'],
            extensions: ['.nds']
        },
         {
            name: 'mGBA',
            executable: 'mGBA.exe',
            defaultArgs: '{rom}',
            platforms: ['gba'],
            extensions: ['.gba']
        }
    ];

    private searchPaths: string[] = [];

    constructor() {
        // Define common install paths
        const home = app.getPath('home');
        const appData = app.getPath('appData'); // Roaming
        const localAppData = path.join(home, 'AppData', 'Local');
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';

        this.searchPaths = [
            path.join(home, 'RetroArch'),
            path.join(appData, 'RetroArch'),
            path.join(localAppData, 'Programs', 'RetroArch'),
            'C:\RetroArch',
            'C:\Emulators',
            path.join(home, 'Documents', 'Emulators'),
            path.join(programFiles, 'Dolphin'),
            path.join(programFiles, 'PCSX2'),
            path.join(programFiles, 'RPCS3'),
            path.join(programFiles, 'Cemu'),
            path.join(localAppData, 'yuzu', 'yuzu-windows-msvc'),
            path.join(home, 'AppData', 'Local', 'Ryujinx'),
            // Add more generic paths if needed
        ];
    }

    public async discover(): Promise<{ emulator: DetectedEmulator, fullPath: string }[]> {
        const results: { emulator: DetectedEmulator, fullPath: string }[] = [];
        const checkedPaths = new Set<string>();

        // Helper to check recursively or directly
        // We will do a limited depth scan or just check direct specific paths for speed
        // For now, we check specific known locations + simple heuristic in C:\Emulators
        
        for (const searchPath of this.searchPaths) {
             if (checkedPaths.has(searchPath)) continue;
             checkedPaths.add(searchPath);
             
             if (fs.existsSync(searchPath)) {
                 // Check if any known emulator exe exists here
                 for (const emu of this.knownEmulators) {
                     const fullPath = path.join(searchPath, emu.executable);
                     if (fs.existsSync(fullPath)) {
                         results.push({ emulator: emu, fullPath });
                     }
                 }
             }
        }
        
        // Also checking the PATH environment variable could be useful
        
        return results;
    }
}

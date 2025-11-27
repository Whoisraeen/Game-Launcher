import fs from 'fs';

export class DriveScanner {
    /**
     * Returns a list of available drive letters (e.g., ['C:\\', 'D:\\', 'E:\\'])
     */
    static getDrives(): string[] {
        const drives: string[] = [];
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        for (let i = 0; i < letters.length; i++) {
            const drive = `${letters[i]}:\\`;
            try {
                // Check if drive exists and is accessible
                if (fs.existsSync(drive)) {
                    drives.push(drive);
                }
            } catch (e) {
                // Ignore drives that throw errors (e.g. empty card readers)
            }
        }

        return drives;
    }
}

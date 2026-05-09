import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface VideoMetadata {
    duration: number;
    codec: string;
    width: number;
    height: number;
    fps: number;
}

export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipe';

export class VideoEditorService {

    async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(videoPath)) {
                return reject(new Error('Video file not found.'));
            }

            ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
                if (err) {
                    return reject(err);
                }
                const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
                if (!videoStream) {
                    return reject(new Error('No video stream found in file.'));
                }

                resolve({
                    duration: metadata.format.duration || 0,
                    codec: videoStream.codec_name || 'unknown',
                    width: videoStream.width || 0,
                    height: videoStream.height || 0,
                    fps: eval(videoStream.avg_frame_rate || '0/0') || 0
                });
            });
        });
    }

    async cutVideo(
        inputPath: string, 
        outputPath: string, 
        startTime: number, 
        durationOrEndTime: number,
        useEndTime: boolean = false
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(inputPath)) {
                return reject(new Error('Input video file not found.'));
            }

            const command = ffmpeg(inputPath)
                .setStartTime(startTime);

            if (useEndTime) {
                command.setDuration(durationOrEndTime - startTime);
            } else {
                command.setDuration(durationOrEndTime);
            }
            
            command
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err: any) => reject(err))
                .save(outputPath);
        });
    }

    async compileHighlights(
        clipPaths: string[],
        outputPath: string,
        transitionType: TransitionType = 'none'
    ): Promise<string> {
        if (clipPaths.length === 0) {
            throw new Error('No clips provided for compilation.');
        }

        for (const clip of clipPaths) {
            if (!fs.existsSync(clip)) {
                throw new Error(`Clip not found: ${clip}`);
            }
        }

        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        if (transitionType === 'none' || clipPaths.length === 1) {
            return this.concatSimple(clipPaths, outputPath);
        }

        return this.concatWithTransitions(clipPaths, outputPath, transitionType);
    }

    private concatSimple(clipPaths: string[], outputPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const listPath = outputPath + '.txt';
            const listContent = clipPaths
                .map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
                .join('\n');
            fs.writeFileSync(listPath, listContent);

            ffmpeg()
                .input(listPath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions(['-c', 'copy'])
                .output(outputPath)
                .on('end', () => {
                    fs.unlinkSync(listPath);
                    resolve(outputPath);
                })
                .on('error', (err: any) => {
                    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
                    reject(err);
                })
                .run();
        });
    }

    private concatWithTransitions(
        clipPaths: string[],
        outputPath: string,
        transitionType: TransitionType
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const transitionDuration = 0.5;
            const command = ffmpeg();

            for (const clip of clipPaths) {
                command.input(clip);
            }

            const filterParts: string[] = [];
            const n = clipPaths.length;

            for (let i = 0; i < n; i++) {
                filterParts.push(`[${i}:v]setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v${i}];`);
                filterParts.push(`[${i}:a]aresample=async=1[a${i}];`);
            }

            let lastVideo = 'v0';
            let lastAudio = 'a0';

            for (let i = 1; i < n; i++) {
                const xfadeType = transitionType === 'fade' ? 'fade' :
                                   transitionType === 'dissolve' ? 'dissolve' : 'wipeleft';
                const outLabel = `xf${i}`;
                const outALabel = `xa${i}`;
                const offset = i * 3 - transitionDuration;
                filterParts.push(`[${lastVideo}][v${i}]xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${Math.max(0, offset)}[${outLabel}];`);
                filterParts.push(`[${lastAudio}][a${i}]acrossfade=d=${transitionDuration}[${outALabel}];`);
                lastVideo = outLabel;
                lastAudio = outALabel;
            }

            const filterComplex = filterParts.join('').replace(/;$/, '');

            command
                .complexFilter(filterComplex, [lastVideo, lastAudio])
                .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac'])
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err: any) => reject(err))
                .run();
        });
    }
}

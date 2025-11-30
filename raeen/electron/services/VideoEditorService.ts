import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';

// Set the ffmpeg path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface VideoMetadata {
    duration: number; // in seconds
    codec: string;
    width: number;
    height: number;
    fps: number;
}

export class VideoEditorService {

    /**
     * Gets basic metadata for a video file.
     * @param videoPath Absolute path to the video file.
     */
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
                    fps: eval(videoStream.avg_frame_rate || '0/0') || 0 // Converts "30/1" to 30
                });
            });
        });
    }

    /**
     * Cuts a segment from a video file.
     * @param inputPath Absolute path to the input video file.
     * @param outputPath Absolute path where the output video will be saved.
     * @param startTime Start time in seconds.
     * @param duration Duration in seconds, or endTime in seconds.
     * @param useEndTime If true, `duration` is treated as `endTime`.
     */
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
}

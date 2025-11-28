
export const getDominantColor = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve('#8b5cf6'); // Default accent
                return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw image to canvas
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // Get image data
            // We'll sample the center area to avoid black borders or generic backgrounds
            const sampleSize = 50;
            const startX = Math.max(0, (img.width / 2) - (sampleSize / 2));
            const startY = Math.max(0, (img.height / 2) - (sampleSize / 2));
            
            try {
                const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize);
                const data = imageData.data;
                
                let r = 0, g = 0, b = 0;
                let count = 0;

                for (let i = 0; i < data.length; i += 4) {
                    // Skip transparent or very dark/white pixels
                    if (data[i + 3] < 128) continue; // Alpha
                    if (data[i] < 20 && data[i+1] < 20 && data[i+2] < 20) continue; // Black
                    if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) continue; // White

                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }

                if (count === 0) {
                    resolve('#8b5cf6');
                    return;
                }

                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);

                // Boost saturation/lightness slightly to ensure visibility as accent
                // Simple RGB adjustment or conversion to HSL could be better, but let's stick to basic RGB for now
                // Ensure it's not too dark
                if (r < 50 && g < 50 && b < 50) {
                    r += 50; g += 50; b += 50;
                }

                resolve(`rgb(${r}, ${g}, ${b})`);
            } catch (e) {
                // Likely CORS error if image is not cached locally and no CORS header
                console.warn('Could not extract color', e);
                resolve('#8b5cf6');
            }
        };

        img.onerror = () => resolve('#8b5cf6');
    });
};

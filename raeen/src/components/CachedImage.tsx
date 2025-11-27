import React, { useState, useEffect } from 'react';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    placeholderSrc?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({ src, placeholderSrc, className, alt, ...props }) => {
    const [imageSrc, setImageSrc] = useState<string>(placeholderSrc || src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        // Reset state when src changes
        setIsLoading(true);
        setHasError(false);
        
        const img = new Image();
        img.src = src;
        
        img.onload = () => {
            setImageSrc(src);
            setIsLoading(false);
        };

        img.onerror = () => {
            setHasError(true);
            setIsLoading(false);
            // Fallback to placeholder if provided, or keep showing nothing/broken
            if (placeholderSrc) setImageSrc(placeholderSrc);
        };

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src, placeholderSrc]);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
                    {/* Optional: Loading Spinner */}
                </div>
            )}
            <img 
                src={imageSrc} 
                alt={alt} 
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                {...props} 
            />
        </div>
    );
};
import React, { useState } from 'react';
import { ImageSet } from '../types';

interface OptimizedImageProps {
  src?: string;
  imageSet?: ImageSet;
  alt: string;
  className?: string;
  priority?: 'thumb' | 'medium' | 'full';
}

/**
 * PRODUCTION READY IMAGE COMPONENT
 * Handles fallback for missing sets and implements basic CDN logic.
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  imageSet,
  alt,
  className = '',
  priority = 'medium',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // If we have a structured imageSet, we use it for the srcset
  if (imageSet) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {!isLoaded && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
        <img
          src={imageSet[priority]}
          srcSet={`${imageSet.thumb} 200w, ${imageSet.medium} 600w, ${imageSet.full} 1200w`}
          sizes="(max-width: 600px) 200px, (max-width: 1200px) 600px, 1200px"
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback to standard src
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
      />
    </div>
  );
};

export default OptimizedImage;

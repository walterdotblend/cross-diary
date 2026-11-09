import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  AdItem,
  fetchRemoteAdsFromGitHub,
  getCachedAds,
  getAdBannerImage,
  getClientLanguage,
  recordAdImpression,
  recordAdClick,
} from '../utils/adNetwork';

interface AdBannerProps {
  onDismiss?: () => void;
  className?: string;
  containerClassName?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ className = '', containerClassName }) => {
  const [ads, setAds] = useState<AdItem[]>(() => getCachedAds());
  const [imageLoaded, setImageLoaded] = useState(false);
  const impressionRecordedRef = useRef<string | null>(null);

  // Fetch updated ads from GitHub repo in background on mount
  useEffect(() => {
    let isMounted = true;
    fetchRemoteAdsFromGitHub().then((remoteList) => {
      if (isMounted && Array.isArray(remoteList) && remoteList.length > 0) {
        setAds(remoteList);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Display the latest/last ad available from the list, or fallback to first
  const currentAd: AdItem | undefined = ads.length > 0 ? (ads[ads.length - 1] || ads[0]) : undefined;
  const lang = getClientLanguage();
  const bannerImageUrl = currentAd ? getAdBannerImage(currentAd, lang) : '';

  // Record impression whenever the current ad changes
  useEffect(() => {
    if (!currentAd || impressionRecordedRef.current === currentAd.id) return;
    impressionRecordedRef.current = currentAd.id;
    recordAdImpression(currentAd.id);
  }, [currentAd?.id]);

  if (!currentAd || !bannerImageUrl) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordAdClick(currentAd.id, currentAd.targetUrl);
    window.open(currentAd.targetUrl, '_blank', 'noopener,noreferrer');
  };

  const bannerCard = (
    <div
      onClick={handleClick}
      className={`relative w-full rounded-2xl overflow-hidden border transition-all duration-200 select-none cursor-pointer group shadow-sm hover:shadow-md hover:border-[var(--accent)] active:scale-[0.99] ${className}`}
      style={{
        background: '#0b0e14',
        borderColor: 'var(--border-strong)',
      }}
      title={lang === 'es' ? `Anuncio: ${currentAd.title || 'Visitar enlace'}` : `Sponsored: ${currentAd.title || 'Visit link'}`}
    >
      {/* Pure Banner Graphic Container matching exact image aspect ratio without bars or cropping */}
      <div className="relative w-full overflow-hidden">
        <img
          src={bannerImageUrl}
          alt={currentAd.title || (lang === 'es' ? 'Anuncio' : 'Sponsored')}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-auto block transition-all duration-300 group-hover:brightness-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Subtle AD indicator tag in the corner */}
        <div className="absolute bottom-1.5 left-2 pointer-events-none">
          <span
            className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase backdrop-blur-md transition-opacity group-hover:opacity-100"
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            AD
          </span>
        </div>

        {/* Hover External Link Hint */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/20 shadow-lg">
            <span>{lang === 'es' ? 'Visitar' : 'Visit'}</span>
            <ExternalLink size={10} />
          </div>
        </div>
      </div>
    </div>
  );

  if (containerClassName) {
    return <div className={containerClassName}>{bannerCard}</div>;
  }
  return bannerCard;
};

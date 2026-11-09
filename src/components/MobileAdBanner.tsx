import React from 'react';
import { AdBanner } from './AdBanner';

interface MobileAdBannerProps {
  onDismiss?: () => void;
  className?: string;
  containerClassName?: string;
}

export const MobileAdBanner: React.FC<MobileAdBannerProps> = (props) => {
  return <AdBanner {...props} />;
};

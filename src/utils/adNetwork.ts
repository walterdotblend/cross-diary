import { recordMetric } from './telemetry';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface AdItem {
  id: string;
  title: string;
  imageUrl?: string;
  mediaVariants?: Record<string, string>; // Language variants e.g. { es: 'https://...', en: 'https://...' }
  targetUrl: string;
  languages?: string[]; // e.g. ['all'] or ['es', 'en']
  enabled?: boolean;
  weight?: number;
}

export interface AdMetrics {
  impressions: number;
  clicks: number;
  lastImpression?: string;
  lastClick?: string;
}

export interface AdSummaryMetrics {
  totalImpressions: number;
  totalClicks: number;
  ctr: string;
  byAd: Record<string, { impressions: number; clicks: number; ctr: string; title?: string }>;
  byLanguage: Record<string, number>;
  byCountry: Record<string, number>;
  byPlatform: Record<string, number>;
  lastUpdated: string;
  recentEvents: Array<{
    adId: string;
    type: 'impressions' | 'clicks';
    platform: string;
    language: string;
    country: string;
    timestamp: string;
  }>;
}

// GitHub Pages URL where ads are hosted and updated remotely
const GITHUB_PAGES_ADS_URL = 'https://walterdotblend.github.io/cross-diary/ads.json';
const GITHUB_RAW_ADS_URL = 'https://raw.githubusercontent.com/walterdotblend/cross-diary/main/docs/ads.json';
const STORAGE_KEY_ADS = 'cross_diary_cached_ads_v4';
const STORAGE_KEY_METRICS = 'cross_diary_ad_metrics_v2';

const R2_CONFIG = {
  accountId: '1de2c446943ed08e0c9ddf857b2d4ab2',
  bucketName: 'crosdiari',
  accessKeyId: 'af0216991a930efce80f0a866cb47fde',
  secretAccessKey: '2b683a2fb7d172096d1af92f03beffdd0905a1ec757a71da44aab49c99750a79',
};

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

let cachedAds: AdItem[] = [];
let isFetchingRemote = false;

export function getClientLanguage(): string {
  try {
    const raw = localStorage.getItem('cross_diary_language');
    if (raw && ['es', 'en', 'pt', 'fr', 'de', 'ja'].includes(raw.toLowerCase())) {
      return raw.toLowerCase();
    }
    const nav = navigator.language || (navigator as any).userLanguage || 'en';
    if (nav.toLowerCase().startsWith('es')) return 'es';
    return 'en';
  } catch {
    return 'en';
  }
}

export function getClientCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Madrid') || tz.includes('Canary')) return 'ES';
    if (tz.includes('Mexico') || tz.includes('Cancun') || tz.includes('Tijuana')) return 'MX';
    if (tz.includes('Argentina') || tz.includes('Buenos_Aires') || tz.includes('Cordoba')) return 'AR';
    if (tz.includes('Bogota')) return 'CO';
    if (tz.includes('Santiago')) return 'CL';
    if (tz.includes('Lima')) return 'PE';
    if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) return 'US';
    if (tz.includes('Sao_Paulo') || tz.includes('Brazil')) return 'BR';
    if (tz.includes('London')) return 'GB';
  } catch {}
  return 'GLOBAL';
}

export function getAdBannerImage(ad: AdItem, lang = getClientLanguage()): string {
  if (ad.mediaVariants) {
    if (lang === 'es' && ad.mediaVariants['es']) return ad.mediaVariants['es'];
    if (ad.mediaVariants['en']) return ad.mediaVariants['en'];
    if (ad.mediaVariants[lang]) return ad.mediaVariants[lang];
    if (ad.mediaVariants['es']) return ad.mediaVariants['es'];
  }
  return ad.imageUrl || '';
}

export function getCachedAds(): AdItem[] {
  if (cachedAds.length > 0) return cachedAds;
  try {
    let raw = localStorage.getItem(STORAGE_KEY_ADS);
    // Migration: Check legacy key and cleanse any old default placeholders
    if (!raw) {
      const oldRaw = localStorage.getItem('cross_diary_cached_ads_v3');
      if (oldRaw) {
        try {
          const oldList = JSON.parse(oldRaw);
          if (Array.isArray(oldList)) {
            const cleaned = oldList.filter(
              (a: any) =>
                a &&
                a.id !== 'ad-cross-diary-pro' &&
                a.id !== 'ad-cross-community' &&
                !a.imageUrl?.startsWith('data:image/svg+xml')
            );
            if (cleaned.length > 0) {
              raw = JSON.stringify(cleaned);
              localStorage.setItem(STORAGE_KEY_ADS, raw);
            }
          }
        } catch {}
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedAds = parsed.filter(
          (a: any) =>
            a &&
            a.enabled !== false &&
            (a.imageUrl || a.mediaVariants) &&
            a.id !== 'ad-cross-diary-pro' &&
            a.id !== 'ad-cross-community' &&
            !a.imageUrl?.startsWith('data:image/svg+xml')
        );
        return cachedAds;
      }
    }
  } catch {}
  return [];
}

export async function fetchRemoteAdsFromGitHub(): Promise<AdItem[]> {
  if (isFetchingRemote) return getCachedAds();
  isFetchingRemote = true;

  const urlsToTry = [GITHUB_RAW_ADS_URL, GITHUB_PAGES_ADS_URL];

  for (const url of urlsToTry) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);

      if (res.ok) {
        const remoteAds = await res.json();
        if (Array.isArray(remoteAds) && remoteAds.length > 0) {
          const valid = remoteAds.filter(
            (a: any) => a && (a.imageUrl || a.mediaVariants) && a.targetUrl && a.enabled !== false
          );
          if (valid.length > 0) {
            cachedAds = valid;
            try {
              localStorage.setItem(STORAGE_KEY_ADS, JSON.stringify(valid));
            } catch {}
            isFetchingRemote = false;
            return valid;
          }
        }
      }
    } catch {
      // try next url
    }
  }

  isFetchingRemote = false;
  // If offline or network unreachable, persist and return the last ads saved in cache
  return getCachedAds();
}

/**
 * Records an ad impression in local metrics, telemetry and Cloudflare R2
 */
export function recordAdImpression(adId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_METRICS);
    const metrics: Record<string, AdMetrics> = raw ? JSON.parse(raw) : {};
    if (!metrics[adId]) {
      metrics[adId] = { impressions: 0, clicks: 0 };
    }
    metrics[adId].impressions = (metrics[adId].impressions || 0) + 1;
    metrics[adId].lastImpression = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_METRICS, JSON.stringify(metrics));
  } catch {}

  recordMetric('ad_impression' as any);
  saveAnalyticsEventToR2('impressions', adId).catch(() => {});
}

/**
 * Records an ad click in local metrics, telemetry and Cloudflare R2
 */
export function recordAdClick(adId: string, targetUrl: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_METRICS);
    const metrics: Record<string, AdMetrics> = raw ? JSON.parse(raw) : {};
    if (!metrics[adId]) {
      metrics[adId] = { impressions: 0, clicks: 0 };
    }
    metrics[adId].clicks = (metrics[adId].clicks || 0) + 1;
    metrics[adId].lastClick = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_METRICS, JSON.stringify(metrics));
  } catch {}

  recordMetric('ad_click' as any);
  saveAnalyticsEventToR2('clicks', adId, targetUrl).catch(() => {});
}

export function getLocalAdMetrics(): Record<string, AdMetrics> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_METRICS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Enhanced R2 Telemetry logger (Zylo-Style)
 * Captures adId, action, language, country, and device platform.
 * Updates both granular event files and the aggregated summary.json.
 */
async function saveAnalyticsEventToR2(type: 'impressions' | 'clicks', adId: string, url?: string) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const eventId = Math.random().toString(36).slice(2, 9);
    const platform =
      typeof window !== 'undefined' && (window as any).crossDiaryNative?.isDesktopApp
        ? 'windows'
        : 'android';
    const language = getClientLanguage();
    const country = getClientCountry();

    const eventPayload = {
      adId,
      type,
      url,
      language,
      country,
      platform,
      timestamp: now.toISOString(),
    };

    // 1. Save granular event file
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: `analytics/ads/events/${dateStr}/${adId}-${type}-${eventId}.json`,
        Body: JSON.stringify(eventPayload),
        ContentType: 'application/json',
      })
    );

    // 2. Fetch or update live summary.json for GitHub Pages dashboard
    try {
      let summary: AdSummaryMetrics = {
        totalImpressions: 0,
        totalClicks: 0,
        ctr: '0.00%',
        byAd: {},
        byLanguage: {},
        byCountry: {},
        byPlatform: {},
        lastUpdated: now.toISOString(),
        recentEvents: [],
      };

      try {
        const getRes = await r2Client.send(
          new GetObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: 'analytics/ads/summary.json',
          })
        );
        if (getRes.Body) {
          const raw = await getRes.Body.transformToString();
          if (raw) summary = JSON.parse(raw);
        }
      } catch {}

      if (type === 'impressions') {
        summary.totalImpressions = (summary.totalImpressions || 0) + 1;
      } else {
        summary.totalClicks = (summary.totalClicks || 0) + 1;
      }

      const totalImp = Math.max(1, summary.totalImpressions);
      summary.ctr = `${((summary.totalClicks / totalImp) * 100).toFixed(2)}%`;

      if (!summary.byAd[adId]) {
        summary.byAd[adId] = { impressions: 0, clicks: 0, ctr: '0.00%' };
      }
      if (type === 'impressions') {
        summary.byAd[adId].impressions = (summary.byAd[adId].impressions || 0) + 1;
      } else {
        summary.byAd[adId].clicks = (summary.byAd[adId].clicks || 0) + 1;
      }
      const adImp = Math.max(1, summary.byAd[adId].impressions);
      summary.byAd[adId].ctr = `${((summary.byAd[adId].clicks / adImp) * 100).toFixed(2)}%`;

      summary.byLanguage[language] = (summary.byLanguage[language] || 0) + 1;
      summary.byCountry[country] = (summary.byCountry[country] || 0) + 1;
      summary.byPlatform[platform] = (summary.byPlatform[platform] || 0) + 1;

      if (!Array.isArray(summary.recentEvents)) summary.recentEvents = [];
      summary.recentEvents.unshift({
        adId,
        type,
        platform,
        language,
        country,
        timestamp: now.toISOString(),
      });
      if (summary.recentEvents.length > 50) {
        summary.recentEvents = summary.recentEvents.slice(0, 50);
      }

      summary.lastUpdated = now.toISOString();

      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_CONFIG.bucketName,
          Key: 'analytics/ads/summary.json',
          Body: JSON.stringify(summary, null, 2),
          ContentType: 'application/json',
        })
      );
    } catch {}
  } catch {}
}

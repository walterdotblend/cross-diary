# Nota de Integración: Sistema Centralizado de Anuncios (Zylo + Sticker Forge + Cross-Diary)

> **IMPORTANTE PARA OTROS CHATS / AGENTES:** `src/utils/adNetwork.ts` está conectado al panel central de anuncios de **Zylo** (`https://zylo.stream`).

- `fetchRemoteAdsFromGitHub()` en `src/utils/adNetwork.ts` consulta primero `https://zylo.stream/api/banners-list/cross_diary` (slot `cross_diary` en el panel Admin de Zylo) y mantiene `docs/ads.json` de GitHub Pages como respaldo automático.
- `recordAdImpression()` envía además un `POST` no bloqueante a `https://zylo.stream/api/banner-track/:id`, y los clics pasan por `https://zylo.stream/api/banner-click/:id` para consolidar estadísticas de países, idiomas, impresiones y CTR en el panel de Zylo.

import { SampleWindowId } from '../types/macro';
export { BUSINESS_CYCLE_PHASES } from '../data/usMacroPresets';

export const SAMPLE_WINDOW_STATS_UI_MAP: Record<SampleWindowId, string> = {
  'full-1970-2025': '全样本期 (1970–2025)',
  'great-moderation-1985-2007': '大缓和时期 (1985–2007)',
  'post-gfc-zirp-2009-2021': '后GFC零利率QE期 (2009–2021)',
  'stagflation-1970-1982': '大滞胀周期 (1970–1982)',
};

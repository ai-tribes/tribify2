export const MIN_DURATION = 1; // 1 minute
export const MAX_DURATION = 1440 * 365 * 4; // 4 years in minutes
export const BASE_APY = 3; // Base APY for minimum stake
export const MAX_APY = 25; // Max APY for 4-year stake

export const calculateAPY = (minutes) => {
  const normalizedDuration = Math.log(minutes) / Math.log(MAX_DURATION);
  const apy = BASE_APY + (MAX_APY - BASE_APY) * normalizedDuration;
  return Math.min(MAX_APY, Math.max(BASE_APY, apy));
};

export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;
  if (minutes < 43200) return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''}`;
  if (minutes < 525600) return `${Math.floor(minutes / 43200)} month${minutes >= 86400 ? 's' : ''}`;
  return `${Math.floor(minutes / 525600)} year${minutes >= 1051200 ? 's' : ''}`;
}; 
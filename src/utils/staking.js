export const MIN_DURATION = 1; // 1 minute
export const MAX_DURATION = 525600 * 4; // 4 years in minutes (525600 = 1 year in minutes)
export const BASE_APY = 0.01; // 0.01% APY for minimum stake (1 minute)
export const MAX_APY = 25; // 25% APY for 4 years

export const calculateAPY = (minutes) => {
  // Linear interpolation based on actual duration
  const durationRatio = minutes / MAX_DURATION;
  const apy = BASE_APY + (MAX_APY - BASE_APY) * durationRatio;
  return Math.min(MAX_APY, Math.max(BASE_APY, apy));
};

// Calculate pro-rated rewards for actual staked time
export const calculateRewards = (amount, duration, stakedMinutes) => {
  const apy = calculateAPY(duration);
  const annualReward = (amount * apy) / 100;
  // Pro-rate for actual staked time (in minutes)
  return Math.floor((annualReward * stakedMinutes) / (525600)); // 525600 minutes in a year
};

export const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return 'Invalid duration';
  return `${minutes} minutes`;
};

// Helper function to convert slider value to actual minutes
export const sliderToMinutes = (value) => {
  // For better UX, use a logarithmic scale
  if (value < 60) return value; // 1-59 minutes
  if (value < 1440) return Math.floor(value / 60) * 60; // Hours
  if (value < 43200) return Math.floor(value / 1440) * 1440; // Days
  if (value < 525600) return Math.floor(value / 43200) * 43200; // Months
  return Math.floor(value / 525600) * 525600; // Years
};

// Helper function to format slider labels
export const formatSliderLabel = (value) => {
  if (value < 60) return `${value}m`;
  if (value < 1440) return `${Math.floor(value / 60)}h`;
  if (value < 43200) return `${Math.floor(value / 1440)}d`;
  if (value < 525600) return `${Math.floor(value / 43200)}mo`;
  return `${Math.floor(value / 525600)}y`;
}; 
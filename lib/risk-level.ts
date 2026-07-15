export type RiskLevel = 'low' | 'medium' | 'high';

const GREEN_TRACK = '#22c55e';
const YELLOW_TRACK = '#eab308';
const RED_TRACK = '#ef4444';

const LOW_THRESHOLD = 50;
const MEDIUM_THRESHOLD = 65;

export function getRiskLevel(scorePercent: number): RiskLevel {
  if (scorePercent <= LOW_THRESHOLD) return 'low';
  if (scorePercent <= MEDIUM_THRESHOLD) return 'medium';
  return 'high';
}

export interface RiskBadgeStyles {
  container: string;
  text: string;
  label: string;
  sliderLabel: string;
}

export function getRiskBadgeStyles(scorePercent: number): RiskBadgeStyles {
  const level = getRiskLevel(scorePercent);
  if (level === 'low') {
    return {
      container: 'bg-green-500/10',
      text: 'text-green-600',
      label: 'Low',
      sliderLabel: 'Low Risk',
    };
  }
  if (level === 'medium') {
    return {
      container: 'bg-yellow-500/10',
      text: 'text-yellow-600',
      label: 'Medium',
      sliderLabel: 'Med Risk',
    };
  }
  return {
    container: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'High',
    sliderLabel: 'High Risk',
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Builds the `linear-gradient(to right, …)` value used as the LTV slider track
 * background. Filled portion (0 → current) is a solid color matching the
 * current risk level; unfilled portion shows the green/yellow/red segments at
 * 25% opacity so the user previews where each risk zone sits.
 */
export function getRiskTrackGradient(maxPercent: number, currentPercent: number): string {
  const safeMax = Math.max(maxPercent, 1);
  const clamped = Math.min(Math.max(currentPercent, 0), safeMax);
  const lowStop = Math.min(LOW_THRESHOLD, safeMax);
  const mediumStop = Math.min(MEDIUM_THRESHOLD, safeMax);

  const level = getRiskLevel(clamped);
  const currentColor =
    level === 'low' ? GREEN_TRACK : level === 'medium' ? YELLOW_TRACK : RED_TRACK;
  const activeColor = hexToRgba(currentColor, 1);

  const stops: string[] = [];
  const currentStopPercent = (clamped / safeMax) * 100;
  stops.push(`${activeColor} 0%`, `${activeColor} ${currentStopPercent}%`);

  const aheadSegments = [
    { start: clamped, end: lowStop, color: GREEN_TRACK },
    { start: Math.max(clamped, lowStop), end: mediumStop, color: YELLOW_TRACK },
    { start: Math.max(clamped, mediumStop), end: safeMax, color: RED_TRACK },
  ].filter(({ start, end }) => end > start);

  aheadSegments.forEach(({ start, end, color }) => {
    const segStart = (start / safeMax) * 100;
    const segEnd = (end / safeMax) * 100;
    const inactiveColor = hexToRgba(color, 0.25);
    stops.push(`${inactiveColor} ${segStart}%`, `${inactiveColor} ${segEnd}%`);
  });

  return `linear-gradient(to right, ${stops.join(', ')})`;
}

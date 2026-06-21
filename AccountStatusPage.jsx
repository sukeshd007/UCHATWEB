// src/utils/timeTracking.js
// Lightweight, per-device "Time Limits" tracker (Instagram-style). Everything
// lives in localStorage — there's no server-side analytics pipeline for this,
// and Instagram's own version is per-device too, so this is a faithful scope.

const USAGE_KEY = 'uchat_time_usage';
const LIMIT_KEY = 'uchat_time_limit_minutes';
const REMINDER_KEY = 'uchat_time_reminder_enabled';
const NOTIFIED_KEY = 'uchat_time_limit_notified_date';

const today = () => new Date().toISOString().split('T')[0];

const readUsage = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) || 'null');
    if (raw && raw.date === today()) return raw;
  } catch {}
  return { date: today(), seconds: 0 };
};

export const getTodayUsageSeconds = () => readUsage().seconds;

// Call periodically (e.g. every 30s) while the tab is visible.
export const recordHeartbeat = (intervalSeconds = 30) => {
  const usage = readUsage();
  usage.seconds += intervalSeconds;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  return usage.seconds;
};

export const getDailyLimitMinutes = () => {
  const v = localStorage.getItem(LIMIT_KEY);
  return v ? parseInt(v, 10) : 0; // 0 = no limit set
};

export const setDailyLimitMinutes = (minutes) => {
  localStorage.setItem(LIMIT_KEY, String(minutes));
  localStorage.removeItem(NOTIFIED_KEY); // allow a fresh reminder under the new limit
};

export const getReminderEnabled = () => localStorage.getItem(REMINDER_KEY) !== '0';
export const setReminderEnabled = (enabled) => localStorage.setItem(REMINDER_KEY, enabled ? '1' : '0');

// Returns true exactly once per day, the first time usage crosses the limit
export const shouldShowLimitReminder = () => {
  const limitMin = getDailyLimitMinutes();
  if (!limitMin || !getReminderEnabled()) return false;
  const usageSec = getTodayUsageSeconds();
  if (usageSec < limitMin * 60) return false;
  const lastNotified = localStorage.getItem(NOTIFIED_KEY);
  if (lastNotified === today()) return false;
  localStorage.setItem(NOTIFIED_KEY, today());
  return true;
};

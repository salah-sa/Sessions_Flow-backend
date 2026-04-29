import { SubscriptionTier } from "../types";

export const PLAN_LIMITS = {
  Free: {
    maxDailyMessages: 15,
    maxDailyImages: 1,
    maxDailyVideos: 0,
    maxDailyFiles: 0,
    maxDailyAttendance: 1,
  },
  Pro: {
    maxDailyMessages: Infinity,
    maxDailyImages: 4,
    maxDailyVideos: 1,
    maxDailyFiles: 1,
    maxDailyAttendance: 2,
  },
  Ultra: {
    maxDailyMessages: Infinity,
    maxDailyImages: 12,
    maxDailyVideos: 5,
    maxDailyFiles: 10,
    maxDailyAttendance: 4,
  },
  Enterprise: {
    maxDailyMessages: Infinity,
    maxDailyImages: Infinity,
    maxDailyVideos: Infinity,
    maxDailyFiles: Infinity,
    maxDailyAttendance: Infinity,
  }
};

export const getTierLimits = (tier?: SubscriptionTier) => {
  return PLAN_LIMITS[tier || "Free"];
};

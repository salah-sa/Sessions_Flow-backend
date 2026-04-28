import { SubscriptionTier } from "../types";

export const PLAN_LIMITS = {
  Free: {
    maxDailyMessages: 15,
    maxDailyImages: 2,
    maxDailyVideos: 1,
    maxDailyFiles: 3,
    maxDailyAttendance: 1,
  },
  Pro: {
    maxDailyMessages: 100,
    maxDailyImages: 10,
    maxDailyVideos: 5,
    maxDailyFiles: 20,
    maxDailyAttendance: 5,
  },
  Ultra: {
    maxDailyMessages: 1000,
    maxDailyImages: 50,
    maxDailyVideos: 25,
    maxDailyFiles: 100,
    maxDailyAttendance: 25,
  },
  Enterprise: {
    maxDailyMessages: 10000,
    maxDailyImages: 1000,
    maxDailyVideos: 500,
    maxDailyFiles: 1000,
    maxDailyAttendance: 1000,
  }
};

export const getTierLimits = (tier?: SubscriptionTier) => {
  return PLAN_LIMITS[tier || "Free"];
};

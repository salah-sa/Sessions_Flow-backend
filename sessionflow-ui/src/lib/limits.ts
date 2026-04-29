import { SubscriptionTier } from "../types";

export const PLAN_LIMITS = {
  Free: {
    maxGroups: 10,
    maxStudentsPerGroup: 8,
    maxDailyMessages: 15,
    maxDailyImages: 1,
    maxDailyVideos: 0,
    maxDailyFiles: 0,
    maxDailyAttendance: 1,
  },
  Pro: {
    maxGroups: 15,
    maxStudentsPerGroup: 25,
    maxDailyMessages: Infinity,
    maxDailyImages: 4,
    maxDailyVideos: 1,
    maxDailyFiles: 1,
    maxDailyAttendance: 2,
  },
  Ultra: {
    maxGroups: 30,
    maxStudentsPerGroup: 40,
    maxDailyMessages: Infinity,
    maxDailyImages: 12,
    maxDailyVideos: 5,
    maxDailyFiles: 10,
    maxDailyAttendance: 4,
  },
  Enterprise: {
    maxGroups: 30,
    maxStudentsPerGroup: 50,
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

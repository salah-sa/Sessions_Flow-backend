import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import { getAttendanceHeatmap, HeatmapDay } from "../api/newFeatures";

export const useAttendanceHeatmap = (year?: number, month?: number) => {
  return useQuery<HeatmapDay[]>({
    queryKey: queryKeys.attendance.heatmap(year, month),
    queryFn: () => getAttendanceHeatmap(year, month),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

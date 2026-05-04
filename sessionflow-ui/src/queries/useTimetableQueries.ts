import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timetableApi } from "../api/resources_extra";
import { queryKeys } from "./keys";
import { TimetableEntry } from "../types";

export const useTimetableEntries = () => {
  return useQuery({
    queryKey: queryKeys.timetable.entries,
    queryFn: () => timetableApi.getEntries(),
  });
};

export const useTimetableMutations = () => {
  const queryClient = useQueryClient();

  const updateAvailability = useMutation({
    mutationFn: (entries: TimetableEntry[]) => timetableApi.updateAvailability(entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetable.all });
    },
  });

  const autoFill = useMutation({
    mutationFn: () => timetableApi.autoFill(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetable.all });
    },
  });

  const updateSchedule = useMutation({
    mutationFn: (items: { id: string; dayOfWeek: number; startTime: string; durationMinutes: number }[]) =>
      timetableApi.updateSchedule(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timetable.all });
    },
  });

  return {
    updateAvailabilityMutation: updateAvailability,
    autoFillMutation: autoFill,
    updateScheduleMutation: updateSchedule,
  };
};

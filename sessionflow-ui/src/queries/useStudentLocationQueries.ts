import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentLocationApi } from "../api/resources_extra";
import { queryKeys } from "./keys";

export const useStudentLocations = () => {
  return useQuery({
    queryKey: queryKeys.students.locations,
    queryFn: () => studentLocationApi.getAll(),
    staleTime: 60_000, 
    refetchOnWindowFocus: false,
  });
};

export const useUpdateStudentLocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { lat: number; lng: number; city: string }) => 
      studentLocationApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.locations });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard.all });
    },
  });
};

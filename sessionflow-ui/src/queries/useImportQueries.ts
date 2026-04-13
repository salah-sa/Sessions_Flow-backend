import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { importApi, gmailApi } from "../api/resources_extra";

export const useImportMutations = () => {
  const queryClient = useQueryClient();

  return {
    testConnection: useMutation({
      mutationFn: ({ email, password }: any) => importApi.testConnection(email, password),
    }),
    preview: useMutation({
      mutationFn: ({ email, password }: any) => importApi.preview(email, password),
    }),
    execute: useMutation({
      mutationFn: ({ email, password }: any) => importApi.execute(email, password),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        queryClient.invalidateQueries({ queryKey: ["students"] });
      },
    }),
  };
};

export const useGmailStatus = () => {
  return useQuery({
    queryKey: ["gmail", "status"],
    queryFn: () => gmailApi.getStatus(),
  });
};

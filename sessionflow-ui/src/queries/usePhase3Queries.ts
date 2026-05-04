import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import {
  autopilotApi,
  momentumApi,
  replayApi,
  absenceApi,
  moodApi,
  type AutopilotRecommendation,
  type MomentumData,
  type MoodSummary,
} from "../api/newFeatures";

// ── #11 Neural Session Autopilot ────────────────────────────
export const useSessionRecommendation = (groupId: string) => {
  return useQuery({
    queryKey: queryKeys.autopilot.recommendation(groupId),
    queryFn: () => autopilotApi.getRecommendation(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAutopilotMutations = () => {
  const queryClient = useQueryClient();
  const dismiss = useMutation({
    mutationFn: (groupId: string) => autopilotApi.dismissRecommendation(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autopilot.all });
    },
  });
  return { dismissMutation: dismiss };
};

// ── #13 Student Momentum Score ──────────────────────────────
export const useStudentMomentum = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.momentum.byStudent(studentId),
    queryFn: () => momentumApi.getScore(studentId),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
};

// ── #15 Ghost Replay Mode ───────────────────────────────────
export const useSessionReplay = (sessionId: string) => {
  return useQuery({
    queryKey: queryKeys.sessionReplay.events(sessionId),
    queryFn: () => replayApi.getEvents(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
};

// ── #16 Predictive Absence Alert ────────────────────────────
export const useAbsencePrediction = (sessionId: string) => {
  return useQuery({
    queryKey: queryKeys.absencePrediction.bySession(sessionId),
    queryFn: () => absenceApi.getPredictions(sessionId),
    enabled: !!sessionId,
    refetchInterval: 60_000,
  });
};

export const useAbsenceReminderMutation = () => {
  const sendReminder = useMutation({
    mutationFn: ({ sessionId, studentIds }: { sessionId: string; studentIds: string[] }) =>
      absenceApi.sendReminder(sessionId, studentIds),
  });
  return { sendReminderMutation: sendReminder };
};

// ── #20 Mood Pulse Check ────────────────────────────────────
export const useMoodSummary = (sessionId: string) => {
  return useQuery({
    queryKey: queryKeys.moodPulse.summary(sessionId),
    queryFn: () => moodApi.getSummary(sessionId),
    enabled: !!sessionId,
    staleTime: 15_000,
  });
};

export const useMoodMutations = () => {
  const queryClient = useQueryClient();
  const submitMood = useMutation({
    mutationFn: ({ sessionId, emoji }: { sessionId: string; emoji: string }) =>
      moodApi.submit(sessionId, emoji),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.moodPulse.summary(vars.sessionId) });
    },
  });
  return { submitMoodMutation: submitMood };
};

/**
 * Phase 4: Premium Features (#21–#30) — TanStack Query Hooks
 * Architecture Guard compliant: all data access via centralized API layer.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import {
  studyPathApi,
  deepAnalyticsApi,
  streaksApi,
  recordingApi,
  scheduleOptimizerApi,
  reportsApi,
  transferApi,
  focusApi,
  encryptedNotesApi,
  type ReportBlock,
} from "../api/premiumFeatures";

// ── #21 AI Study Path ───────────────────────────────────────
export const useStudyPath = (studentId: string) =>
  useQuery({
    queryKey: queryKeys.studyPath.byStudent(studentId),
    queryFn: () => studyPathApi.get(studentId),
    enabled: !!studentId,
    staleTime: 5 * 60_000,
  });

export const useGenerateStudyPath = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studyPathApi.generate(studentId),
    onSuccess: (_, studentId) => {
      qc.invalidateQueries({ queryKey: queryKeys.studyPath.byStudent(studentId) });
    },
  });
};

// ── #22 Deep Analytics ──────────────────────────────────────
export const useCohortAnalytics = (months = 6) =>
  useQuery({
    queryKey: queryKeys.deepAnalytics.cohort(months),
    queryFn: () => deepAnalyticsApi.cohort(months),
    staleTime: 10 * 60_000,
  });

export const useRetentionFunnel = (range = "90d") =>
  useQuery({
    queryKey: queryKeys.deepAnalytics.retention(range),
    queryFn: () => deepAnalyticsApi.retention(range),
    staleTime: 10 * 60_000,
  });

export const useForecast = (metric: string, range = "30d") =>
  useQuery({
    queryKey: queryKeys.deepAnalytics.forecast(metric, range),
    queryFn: () => deepAnalyticsApi.forecast(metric, range),
    enabled: !!metric,
    staleTime: 5 * 60_000,
  });

export const useCustomAnalytics = (params: { metric: string; groupId?: string; from?: string; to?: string }) =>
  useQuery({
    queryKey: queryKeys.deepAnalytics.custom(params),
    queryFn: () => deepAnalyticsApi.custom(params),
    enabled: !!params.metric,
    staleTime: 2 * 60_000,
  });

// ── #24 Streaks ─────────────────────────────────────────────
export const useStudentStreak = (studentId: string) =>
  useQuery({
    queryKey: queryKeys.streaks.byStudent(studentId),
    queryFn: () => streaksApi.get(studentId),
    enabled: !!studentId,
    staleTime: 2 * 60_000,
  });

export const useStreakLeaderboard = (groupId: string) =>
  useQuery({
    queryKey: queryKeys.streaks.leaderboard(groupId),
    queryFn: () => streaksApi.leaderboard(groupId),
    enabled: !!groupId,
    staleTime: 60_000,
  });

// ── #25 Session Recordings ──────────────────────────────────
export const useSessionRecordings = (sessionId: string) =>
  useQuery({
    queryKey: queryKeys.sessionRecordings.bySession(sessionId),
    queryFn: () => recordingApi.list(sessionId),
    enabled: !!sessionId,
  });

export const useRecordingMutations = (sessionId: string) => {
  const qc = useQueryClient();
  const startMut = useMutation({
    mutationFn: () => recordingApi.start(sessionId),
  });
  const stopMut = useMutation({
    mutationFn: () => recordingApi.stop(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sessionRecordings.bySession(sessionId) });
    },
  });
  return { startRecording: startMut, stopRecording: stopMut };
};

// ── #26 Schedule Optimizer ──────────────────────────────────
export const useScheduleOptimization = (engineerId: string) =>
  useQuery({
    queryKey: queryKeys.scheduleOptimizer.suggestions(engineerId),
    queryFn: () => scheduleOptimizerApi.getSuggestions(engineerId),
    enabled: !!engineerId,
    staleTime: 5 * 60_000,
  });

export const useApplyOptimization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => scheduleOptimizerApi.apply(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.scheduleOptimizer.all });
      qc.invalidateQueries({ queryKey: queryKeys.timetable.all });
    },
  });
};

// ── #27 Reports ─────────────────────────────────────────────
export const useReportTemplates = () =>
  useQuery({
    queryKey: queryKeys.reports.templates,
    queryFn: () => reportsApi.getTemplates(),
    staleTime: 5 * 60_000,
  });

export const useSaveReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, schema }: { name: string; schema: { blocks: ReportBlock[] } }) =>
      reportsApi.saveTemplate(name, schema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reports.templates });
    },
  });
};

export const useDeleteReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportsApi.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reports.templates });
    },
  });
};

export const useGenerateReport = () =>
  useMutation({
    mutationFn: (schema: { blocks: ReportBlock[] }) => reportsApi.generate(schema),
  });

// ── #28 Student Transfer ────────────────────────────────────
export const useTransferCheck = (studentId: string, targetGroupId: string) =>
  useQuery({
    queryKey: ["transfer-check", studentId, targetGroupId],
    queryFn: () => transferApi.check(studentId, targetGroupId),
    enabled: !!studentId && !!targetGroupId,
  });

export const useTransferStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, targetGroupId }: { studentId: string; targetGroupId: string }) =>
      transferApi.execute(studentId, targetGroupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.students.all });
      qc.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
};

// ── #29 Focus Timer ─────────────────────────────────────────
export const useFocusStats = (studentId: string, range = "7d") =>
  useQuery({
    queryKey: queryKeys.focusTimer.stats(studentId, range),
    queryFn: () => focusApi.stats(studentId, range),
    enabled: !!studentId,
    staleTime: 60_000,
  });

export const useGroupFocusStats = (groupId: string) =>
  useQuery({
    queryKey: queryKeys.focusTimer.groupStats(groupId),
    queryFn: () => focusApi.groupStats(groupId),
    enabled: !!groupId,
    staleTime: 60_000,
  });

export const useFocusMutations = () => {
  const qc = useQueryClient();
  const startFocus = useMutation({
    mutationFn: (durationMinutes: number) => focusApi.start(durationMinutes),
  });
  const completeFocus = useMutation({
    mutationFn: ({ focusMinutes, breakMinutes }: { focusMinutes: number; breakMinutes: number }) =>
      focusApi.complete(focusMinutes, breakMinutes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.focusTimer.all });
    },
  });
  return { startFocus, completeFocus };
};

// ── #30 Encrypted Notes ─────────────────────────────────────
export const useEncryptedNote = (entityType: string, entityId: string) =>
  useQuery({
    queryKey: queryKeys.encryptedNotes.byEntity(entityType, entityId),
    queryFn: () => encryptedNotesApi.get(entityType, entityId),
    enabled: !!entityType && !!entityId,
    staleTime: 5 * 60_000,
  });

export const useNoteList = () =>
  useQuery({
    queryKey: queryKeys.encryptedNotes.list,
    queryFn: () => encryptedNotesApi.list(),
    staleTime: 5 * 60_000,
  });

export const useSaveEncryptedNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId, encryptedBlob, iv }: {
      entityType: string; entityId: string; encryptedBlob: string; iv: string;
    }) => encryptedNotesApi.save(entityType, entityId, { encryptedBlob, iv }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.encryptedNotes.byEntity(vars.entityType, vars.entityId) });
      qc.invalidateQueries({ queryKey: queryKeys.encryptedNotes.list });
    },
  });
};

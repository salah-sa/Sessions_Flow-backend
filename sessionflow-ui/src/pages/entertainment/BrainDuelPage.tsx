import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, TrendingUp, Clock, ChevronRight, Zap, Target, Crown, ArrowLeft, CheckCircle, XCircle, Timer, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";
import { useDuelStats, useDuelLeaderboard, useDuelHistory, useCreateDuel, useJoinDuel, useSubmitDuel, useDuelQuestions } from "../../queries/useEntertainmentQueries";
import { DuelQuestionData } from "../../api/entertainmentApi";
import { toast } from "sonner";

type Tab = "play" | "leaderboard" | "history";
type GamePhase = "lobby" | "playing" | "submitting" | "results";

const TIME_PER_QUESTION = 30; // seconds

const BrainDuelPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("play");
  const { data: stats } = useDuelStats();
  const { data: leaderboard } = useDuelLeaderboard();
  const { data: history } = useDuelHistory();
  const createDuel = useCreateDuel();
  const joinDuel = useJoinDuel();
  const submitDuel = useSubmitDuel();
  const [subject, setSubject] = useState("general");

  // Gameplay state
  const [gamePhase, setGamePhase] = useState<GamePhase>("lobby");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedIndex: number; responseTimeMs: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitResult, setSubmitResult] = useState<{ yourScore: number; opponentScore: number; isWinner: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: questions, isLoading: questionsLoading } = useDuelQuestions(activeMatchId);

  const subjects = ["general", "math", "science", "language", "history"];
  const winRate = stats && stats.totalDuels > 0 ? Math.round((stats.wins / stats.totalDuels) * 100) : 0;

  // Timer logic
  useEffect(() => {
    if (gamePhase !== "playing" || !questions?.length) return;

    setTimeLeft(TIME_PER_QUESTION);
    setQuestionStartTime(Date.now());

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-advance on timeout
          handleAnswerSelect(-1); // -1 = no answer
          return TIME_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gamePhase, currentQuestionIndex, questions]);

  const handleCreateDuel = () => {
    createDuel.mutate(subject, {
      onSuccess: (data) => {
        setActiveMatchId(data.id);
        setGamePhase("playing");
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setSelectedOption(null);
        setSubmitResult(null);
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to create duel");
      },
    });
  };

  const handleJoinDuel = () => {
    joinDuel.mutate(undefined, {
      onSuccess: (data) => {
        setActiveMatchId(data.id);
        setGamePhase("playing");
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setSelectedOption(null);
        setSubmitResult(null);
      },
      onError: (err: any) => {
        toast.error(err.message || "No open duels available");
      },
    });
  };

  const handleAnswerSelect = useCallback((optionIndex: number) => {
    if (!questions || selectedOption !== null) return;
    
    const question = questions[currentQuestionIndex];
    if (!question) return;

    const responseTimeMs = Date.now() - questionStartTime;
    setSelectedOption(optionIndex);

    const newAnswer = {
      questionId: question.id,
      selectedIndex: optionIndex,
      responseTimeMs,
    };

    setAnswers((prev) => [...prev, newAnswer]);

    // Advance to next question or submit after brief delay
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setSelectedOption(null);
        setTimeLeft(TIME_PER_QUESTION);
        setQuestionStartTime(Date.now());
      } else {
        // All questions answered — submit
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmitDuel([...answers, newAnswer]);
      }
    }, 800);
  }, [questions, currentQuestionIndex, selectedOption, questionStartTime, answers]);

  const handleSubmitDuel = (finalAnswers: typeof answers) => {
    if (!activeMatchId) return;
    setGamePhase("submitting");

    submitDuel.mutate(
      { matchId: activeMatchId, answers: finalAnswers },
      {
        onSuccess: (result) => {
          setSubmitResult({
            yourScore: result.yourScore,
            opponentScore: result.opponentScore,
            isWinner: result.isWinner,
          });
          setGamePhase("results");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to submit answers");
          setGamePhase("lobby");
        },
      }
    );
  };

  const handleBackToLobby = () => {
    setGamePhase("lobby");
    setActiveMatchId(null);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setSubmitResult(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const currentQuestion: DuelQuestionData | null = questions?.[currentQuestionIndex] ?? null;

  return (
    <div className="h-full flex flex-col bg-[var(--ui-bg)] overflow-hidden relative">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-cyan-600/8 via-blue-600/6 to-indigo-600/8 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-6 sm:px-8 shrink-0 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4">
            {gamePhase !== "lobby" && (
              <button onClick={handleBackToLobby} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-3">
                <Swords className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Brain Duel Arena</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {gamePhase === "playing" ? `Question ${currentQuestionIndex + 1}/${questions?.length ?? "?"}` :
                 gamePhase === "results" ? "Duel Complete!" :
                 gamePhase === "submitting" ? "Calculating..." :
                 "Challenge Your Mind"}
              </h1>
              <p className="text-xs text-slate-500">
                {gamePhase === "playing" ? "Select the correct answer before time runs out!" :
                 gamePhase === "results" ? "Here are your results" :
                 "Turn-based trivia battles. Create or join a duel!"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ GAMEPLAY SCREEN ═══ */}
      {gamePhase === "playing" && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar relative z-10">
          {questionsLoading || !currentQuestion ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-slate-500">Loading questions...</p>
            </div>
          ) : (
            <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="max-w-lg mx-auto space-y-6">
              {/* Timer bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Timer className="w-3.5 h-3.5" />
                    <span className={cn("font-bold", timeLeft <= 5 ? "text-red-400 animate-pulse" : timeLeft <= 10 ? "text-amber-400" : "text-cyan-400")}>
                      {timeLeft}s
                    </span>
                  </div>
                  <span className="text-slate-600 font-semibold">{currentQuestionIndex + 1} of {questions?.length ?? 0}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full transition-colors", timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-amber-500" : "bg-cyan-500")}
                    initial={{ width: "100%" }}
                    animate={{ width: `${(timeLeft / TIME_PER_QUESTION) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5">
                <p className="text-base sm:text-lg text-white leading-relaxed text-center font-medium">
                  {currentQuestion.text}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => handleAnswerSelect(i)}
                    disabled={selectedOption !== null}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all text-sm font-medium",
                      selectedOption === null
                        ? "bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.08] hover:border-cyan-500/30 cursor-pointer"
                        : selectedOption === i
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                          : "bg-white/[0.01] border-white/5 text-slate-600 cursor-default"
                    )}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0",
                        selectedOption === i
                          ? "bg-cyan-500/30 border-cyan-500/50 text-cyan-300"
                          : "bg-white/5 border-white/10 text-slate-500"
                      )}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {(questions ?? []).map((_: DuelQuestionData, i: number) => (
                  <div key={i} className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i < currentQuestionIndex ? "bg-cyan-500" :
                    i === currentQuestionIndex ? "bg-white w-4" :
                    "bg-white/10"
                  )} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══ SUBMITTING SCREEN ═══ */}
      {gamePhase === "submitting" && (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
            <p className="text-lg font-semibold text-white">Calculating Results...</p>
            <p className="text-xs text-slate-500">Comparing your answers with the opponent</p>
          </motion.div>
        </div>
      )}

      {/* ═══ RESULTS SCREEN ═══ */}
      {gamePhase === "results" && submitResult && (
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto space-y-6 pt-8">
            {/* Result icon */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className={cn("w-24 h-24 rounded-3xl mx-auto flex items-center justify-center mb-4",
                  submitResult.isWinner ? "bg-emerald-500/20 border-2 border-emerald-500/30" : "bg-red-500/20 border-2 border-red-500/30"
                )}
              >
                {submitResult.isWinner ? (
                  <Trophy className="w-12 h-12 text-emerald-400" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-400" />
                )}
              </motion.div>
              <h2 className={cn("text-3xl font-bold", submitResult.isWinner ? "text-emerald-400" : "text-red-400")}>
                {submitResult.isWinner ? "Victory!" : submitResult.yourScore === submitResult.opponentScore ? "Draw!" : "Defeat"}
              </h2>
            </div>

            {/* Score comparison */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">{submitResult.yourScore}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">You</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-600">VS</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-rose-400">{submitResult.opponentScore}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Opponent</p>
              </div>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-center">
                <p className="text-lg font-bold text-white">{answers.length}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Questions</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-center">
                <p className="text-lg font-bold text-white">
                  {answers.length > 0 ? Math.round(answers.reduce((a, b) => a + b.responseTimeMs, 0) / answers.length / 1000 * 10) / 10 : 0}s
                </p>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Avg Time</p>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={handleBackToLobby}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Back to Arena
            </button>
          </motion.div>
        </div>
      )}

      {/* ═══ LOBBY (original tabs) ═══ */}
      {gamePhase === "lobby" && (
        <>
          {/* Stats Bar */}
          {stats && stats.totalDuels > 0 && (
            <div className="px-4 sm:px-8 mb-4 relative z-10">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Rating", value: stats.rating, icon: <Zap className="w-3.5 h-3.5" />, color: "text-amber-400" },
                  { label: "Wins", value: stats.wins, icon: <Trophy className="w-3.5 h-3.5" />, color: "text-emerald-400" },
                  { label: "Win Rate", value: `${winRate}%`, icon: <Target className="w-3.5 h-3.5" />, color: "text-cyan-400" },
                  { label: "Streak", value: stats.currentWinStreak, icon: <TrendingUp className="w-3.5 h-3.5" />, color: "text-violet-400" },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                    <div className={cn("flex items-center justify-center gap-1 mb-1", s.color)}>
                      {s.icon}
                      <span className="text-lg font-bold">{s.value}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="px-4 sm:px-8 mb-4 relative z-10">
            <div className="flex gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
              {(["play", "leaderboard", "history"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize",
                    tab === t ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300")}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 custom-scrollbar relative z-10">
            <AnimatePresence mode="wait">
              {tab === "play" && (
                <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-4">
                  {/* Subject selector */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400">Choose Subject</p>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((s) => (
                        <button key={s} onClick={() => setSubject(s)}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border",
                            subject === s ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "bg-white/[0.02] border-white/5 text-slate-500 hover:border-white/10")}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleCreateDuel} disabled={createDuel.isPending}
                      className="group p-6 rounded-2xl bg-gradient-to-br from-cyan-600/20 to-blue-600/10 border border-cyan-500/20 hover:border-cyan-500/30 transition-all text-left disabled:opacity-50">
                      {createDuel.isPending ? (
                        <Loader2 className="w-8 h-8 text-cyan-400 mb-3 animate-spin" />
                      ) : (
                        <Swords className="w-8 h-8 text-cyan-400 mb-3" />
                      )}
                      <p className="text-sm font-bold text-white mb-1">Create Duel</p>
                      <p className="text-[10px] text-slate-500">Start a match & jump straight in</p>
                    </button>
                    <button onClick={handleJoinDuel} disabled={joinDuel.isPending}
                      className="group p-6 rounded-2xl bg-gradient-to-br from-violet-600/20 to-purple-600/10 border border-violet-500/20 hover:border-violet-500/30 transition-all text-left disabled:opacity-50">
                      {joinDuel.isPending ? (
                        <Loader2 className="w-8 h-8 text-violet-400 mb-3 animate-spin" />
                      ) : (
                        <Target className="w-8 h-8 text-violet-400 mb-3" />
                      )}
                      <p className="text-sm font-bold text-white mb-1">Quick Match</p>
                      <p className="text-[10px] text-slate-500">Join an existing open duel</p>
                    </button>
                  </div>
                </motion.div>
              )}

              {tab === "leaderboard" && (
                <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-2">
                  {leaderboard?.map((entry, i) => (
                    <div key={entry.userId} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                        i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-slate-400/20 text-slate-300" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-slate-500")}>
                        {i < 3 ? <Crown className="w-4 h-4" /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">Player {entry.userId.slice(0, 6)}</p>
                        <p className="text-[10px] text-slate-500">{entry.wins}W / {entry.losses}L</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-cyan-400">{entry.rating}</p>
                        <p className="text-[9px] text-slate-500">ELO</p>
                      </div>
                    </div>
                  ))}
                  {(!leaderboard || leaderboard.length === 0) && (
                    <div className="text-center py-12 text-slate-500 text-sm">No duels completed yet. Be the first!</div>
                  )}
                </motion.div>
              )}

              {tab === "history" && (
                <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto space-y-2">
                  {history?.map((m) => (
                    <div key={m.id} className={cn("flex items-center gap-3 p-3 rounded-xl border",
                      m.isWinner ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10")}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                        m.isWinner ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                        {m.isWinner ? <Trophy className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white capitalize">{m.subject} Duel</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(m.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", m.isWinner ? "text-emerald-400" : "text-red-400")}>
                          {m.isChallenger ? m.challengerScore : m.opponentScore} - {m.isChallenger ? m.opponentScore : m.challengerScore}
                        </p>
                        <p className="text-[9px] text-slate-500">{m.isWinner ? "Victory" : "Defeat"}</p>
                      </div>
                    </div>
                  ))}
                  {(!history || history.length === 0) && (
                    <div className="text-center py-12 text-slate-500 text-sm">No duels yet. Start your first battle!</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

export default BrainDuelPage;

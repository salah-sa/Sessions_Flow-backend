$p = 'sessionflow-ui/src/pages/DashboardPage.tsx'
$c = Get-Content $p -Raw
$targetText = '                <div className="space-y-2.5">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest items-baseline">
                    <span className="text-slate-400">{t("dashboard.insights.completion_rate")}</span>
                    <span className="text-cyan-400 font-sora text-sm">92%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800/40 rounded-full overflow-hidden p-0.5">
                    <div className="h-full w-[92%] bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-1000 ease-out" />
                  </div>
                </div>'

$replacementText = '                <div className="space-y-2.5">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest items-baseline">
                    <span className="text-slate-400">{t("dashboard.insights.completion_rate")}</span>
                    <span className="text-cyan-400 font-sora text-sm">
                      {Math.round(((summaryData?.completedSessionsAllTime || 0) / ((summaryData?.completedSessionsAllTime || 0) + (summaryData?.upcomingSessions || 0)) || 0) * 100) || 0}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800/40 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-1000 ease-out"
                      style={{ width: `${Math.round(((summaryData?.completedSessionsAllTime || 0) / ((summaryData?.completedSessionsAllTime || 0) + (summaryData?.upcomingSessions || 0)) || 0) * 100) || 0}%` }}
                    />
                  </div>
                </div>'

# Normalize newlines to match file (could be CRLF on windows)
$targetText = $targetText.Replace("`n", "[char]10").Replace("`r", "[char]13")
# Actually, just search for the strings regardless of line breaks if possible, 
# but PowerShell -replace on Raw content handles it if strings match.

if ($c.Contains($targetText.Replace("[char]10", "`n").Replace("[char]13", "`r"))) {
    $c = $c.Replace($targetText.Replace("[char]10", "`n").Replace("[char]13", "`r"), $replacementText.Replace("[char]10", "`n").Replace("[char]13", "`r"))
} else {
    Write-Host "Target not found precisely. Trying fuzzy match..."
    # Fallback to a regex if precise match fails
}

Set-Content $p $c -NoNewline

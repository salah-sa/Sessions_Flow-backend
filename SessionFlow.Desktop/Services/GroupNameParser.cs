using System.Text.RegularExpressions;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Production-grade parser for messy 3C School group name strings.
/// Handles: case insensitivity, missing/extra dots, spaces in names,
/// concatenated tokens like "unity4SALAH", "Semi pri", etc.
/// Correctly reconstitutes dot-split times like "7.30pm" → "7:30PM".
/// 
/// Output: A strongly-typed ParsedGroupName with standardized format
/// e.g. "3C.MID.UNITY.2"
/// </summary>
public static class GroupNameParser
{
    // ─── Known Vocabularies ────────────────────────────────────────

    private static readonly string[] KnownLevels = { "mid", "sr", "jr", "pri" };
    private static readonly string[] KnownTracks = { "ar", "er", "med", "ts", "reatt" };
    private static readonly string[] KnownCourses = { "unity", "c#", "python", "blender", "scratch", "roblox" };
    private static readonly string[] KnownSubLevels = { "semi pri", "semipri", "semi-pri" };
    private static readonly string[] IgnoreTokens = { "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8" };

    // ─── Result Model ──────────────────────────────────────────────

    public class ParsedGroupName
    {
        public string? Level { get; set; }          // MID, SR, JR, PRI
        public string? SubLevel { get; set; }       // SEMI PRI etc.
        public string? Track { get; set; }          // AR, ER, MED
        public string? Course { get; set; }         // UNITY, C#, PYTHON
        public int? GroupNumber { get; set; }        // 1, 2, 3, 4
        public string? Instructor { get; set; }     // Salah, etc.
        public DateTime? ParsedDate { get; set; }   // 11/11/2025 etc.
        public string? ParsedTime { get; set; }     // 7:30PM etc.
        public string? Code { get; set; }           // 50087, 51320 etc.
        public string RawInput { get; set; } = "";
        public string StandardizedName { get; set; } = "";
        public double Confidence { get; set; } = 0;
        public List<string> Warnings { get; set; } = new();

        /// <summary>
        /// A human-readable display name: "Mid Unity 3" or "Mid Semi Pri Unity 2"
        /// </summary>
        public string DisplayName
        {
            get
            {
                var parts = new List<string>();
                if (!string.IsNullOrEmpty(Level)) parts.Add(CapFirst(Level));
                if (!string.IsNullOrEmpty(SubLevel)) parts.Add(CapFirst(SubLevel));
                if (!string.IsNullOrEmpty(Track)) parts.Add(Track);
                if (!string.IsNullOrEmpty(Course))
                {
                    parts.Add(CapFirst(Course) + (GroupNumber.HasValue ? $" {GroupNumber}" : ""));
                }
                return parts.Count > 0 ? string.Join(" ", parts) : RawInput;
            }
        }

        private static string CapFirst(string s) =>
            string.IsNullOrEmpty(s) ? s : char.ToUpper(s[0]) + s.Substring(1).ToLower();
    }

    // ─── Main Parse Entry ──────────────────────────────────────────

    public static ParsedGroupName Parse(string? raw)
    {
        var result = new ParsedGroupName { RawInput = raw ?? "" };
        if (string.IsNullOrWhiteSpace(raw))
        {
            result.Warnings.Add("Empty input");
            return result;
        }

        // Step 1: Normalize — collapse double dots, trim
        var normalized = raw.Trim();
        normalized = Regex.Replace(normalized, @"\.{2,}", ".");
        normalized = normalized.TrimEnd('.');

        // Step 2: Tokenize on dots, spaces, or colons
        var splitTokens = normalized.Split(new[] { '.', ':', '-' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim())
            .ToList();

        // Further split tokens by space if they aren't purely dates or times
        var refinedTokens = new List<string>();
        foreach (var rt in splitTokens)
        {
            if (Regex.IsMatch(rt, @"^\d{6,8}$") || Regex.IsMatch(rt, @"^\d{1,2}:\d{2}"))
            {
                refinedTokens.Add(rt);
            }
            else
            {
                refinedTokens.AddRange(rt.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries));
            }
        }

        // Step 2b: CRITICAL — Reconstitute dot-split time tokens.
        // "7.30pm" splits into ["7", "30pm"]. Merge them back.
        // Also handles "2:30m" typos (treat as "2:30pm")
        var tokens = MergeTimeParts(refinedTokens);

        // Step 3: Remove "3c" prefix
        if (tokens.Count > 0 && tokens[0].Equals("3c", StringComparison.OrdinalIgnoreCase))
            tokens.RemoveAt(0);

        // Step 4: Process each token
        var unmatched = new List<string>();
        foreach (var token in tokens)
        {
            ProcessToken(token, result, unmatched);
        }

        // Step 5: Try to resolve unmatched tokens (instructor name)
        foreach (var um in unmatched)
        {
            if (Regex.IsMatch(um, @"^[A-Za-z\s]{3,}$") && result.Instructor == null)
            {
                var lower = um.ToLowerInvariant();
                if (!KnownLevels.Contains(lower) && !KnownTracks.Contains(lower) &&
                    !KnownCourses.Contains(lower) && !IgnoreTokens.Contains(lower))
                {
                    result.Instructor = um;
                }
            }
        }

        // Step 6: Build outputs
        result.StandardizedName = BuildStandardizedName(result);
        result.Confidence = CalculateConfidence(result);

        return result;
    }

    // ─── Time Part Merger ──────────────────────────────────────────

    /// <summary>
    /// Scans adjacent tokens for dot-split time patterns and merges them.
    /// "7" + "30pm" → "7:30pm"
    /// Also handles: "2" + "30m" → "2:30pm" (typo fix)
    /// </summary>
    private static List<string> MergeTimeParts(List<string> tokens)
    {
        var merged = new List<string>();
        int i = 0;
        while (i < tokens.Count)
        {
            // Check if current is a bare 1-2 digit number and next is a minutes+ampm token
            if (i + 1 < tokens.Count &&
                Regex.IsMatch(tokens[i], @"^\d{1,2}$") &&
                Regex.IsMatch(tokens[i + 1], @"^\d{0,2}\s*(am|pm|m)$", RegexOptions.IgnoreCase))
            {
                var hourPart = tokens[i];
                var minAmPm = tokens[i + 1];

                // Fix typo: "30m" → "30pm"
                if (minAmPm.EndsWith("m", StringComparison.OrdinalIgnoreCase) &&
                    !minAmPm.EndsWith("am", StringComparison.OrdinalIgnoreCase) &&
                    !minAmPm.EndsWith("pm", StringComparison.OrdinalIgnoreCase))
                {
                    minAmPm = minAmPm.Substring(0, minAmPm.Length - 1) + "pm";
                }

                merged.Add($"{hourPart}:{minAmPm}");
                i += 2;
                continue;
            }

            // Check if current token is a bare 1-2 digit number that could be
            // part of "H:MMam/pm" where the colon variant wasn't split
            merged.Add(tokens[i]);
            i++;
        }
        return merged;
    }

    // ─── Token Processing ──────────────────────────────────────────

    private static void ProcessToken(string token, ParsedGroupName result, List<string> unmatched)
    {
        var lower = token.ToLowerInvariant().Trim();

        // 0) Skip known ignorable tokens (S1, S2, S5 etc. — section markers)
        if (IgnoreTokens.Contains(lower)) return;

        // 1) Date pattern: ddmmyyyy or dmmyyyy (7-8 digits)
        var dateMatch = Regex.Match(token, @"^(\d{1,2})(\d{2})(\d{4})$");
        if (dateMatch.Success)
        {
            if (int.TryParse(dateMatch.Groups[1].Value, out var day) &&
                int.TryParse(dateMatch.Groups[2].Value, out var month) &&
                int.TryParse(dateMatch.Groups[3].Value, out var year))
            {
                try { result.ParsedDate = new DateTime(year, month, day); return; }
                catch { /* invalid date, continue */ }
            }
        }

        // 2) Time pattern: "7:30pm", "3pm", "9:00PM", "2:30PM", "5:00PM"
        var timeMatch = Regex.Match(token, @"^(\d{1,2})(?:[:.:](\d{2}))?\s*(am|pm)$", RegexOptions.IgnoreCase);
        if (timeMatch.Success)
        {
            var hour = int.Parse(timeMatch.Groups[1].Value);
            var minute = timeMatch.Groups[2].Success ? timeMatch.Groups[2].Value : "00";
            var ampm = timeMatch.Groups[3].Value.ToUpper();
            result.ParsedTime = $"{hour}:{minute}{ampm}";
            return;
        }

        // 3) Pure numeric code (4-5 digits)
        if (Regex.IsMatch(token, @"^\d{4,5}$"))
        {
            result.Code = token;
            return;
        }

        // 3b) Skip bare 1-2 digit numbers that weren't caught by time merge
        //     These are likely orphaned time fragments or noise
        if (Regex.IsMatch(token, @"^\d{1,2}$"))
        {
            // This could be a time fragment that didn't get merged. Skip it.
            return;
        }

        // 4) Sub-level: "Semi pri", "Semipri", "semi-pri"
        var lowerNoSpace = lower.Replace(" ", "").Replace("-", "");
        foreach (var sl in KnownSubLevels)
        {
            if (lowerNoSpace == sl.Replace(" ", "").Replace("-", ""))
            {
                result.SubLevel = "SEMI PRI";
                // Semi Pri also implies Level=MID if not already set
                if (result.Level == null) result.Level = "MID";
                return;
            }
        }

        // 5) Exact level match
        if (KnownLevels.Contains(lower))
        {
            if (result.Level == null)
                result.Level = lower.ToUpperInvariant();
            return;
        }

        // 6) Exact track match
        if (KnownTracks.Contains(lower))
        {
            if (result.Track == null)
                result.Track = lower.ToUpperInvariant();
            return;
        }

        // 7) Course with optional group number and optional instructor
        //    Handles: "Unity 2", "unity4SALAH", "unity 3", "unity2", "Unity1"
        foreach (var course in KnownCourses)
        {
            var coursePattern = $@"(?i)^{Regex.Escape(course)}\s*(\d+)?\s*([A-Za-z]{{3,}})?$";
            var courseMatch = Regex.Match(token, coursePattern);
            if (courseMatch.Success)
            {
                result.Course = course.ToUpperInvariant();

                if (courseMatch.Groups[1].Success && int.TryParse(courseMatch.Groups[1].Value, out var gn))
                    result.GroupNumber = gn;

                if (courseMatch.Groups[2].Success)
                {
                    var possibleInstructor = courseMatch.Groups[2].Value;
                    var instrLower = possibleInstructor.ToLowerInvariant();
                    if (!KnownLevels.Contains(instrLower) && !KnownTracks.Contains(instrLower))
                        result.Instructor = possibleInstructor;
                }
                return;
            }
        }

        // 8) "Reatt Unity 1" compound — check for "reatt" prefix with course after space
        if (lower.StartsWith("reatt"))
        {
            result.Track = "REATT";
            var afterReatt = token.Substring(5).Trim();
            if (!string.IsNullOrEmpty(afterReatt))
                ProcessToken(afterReatt, result, unmatched);
            return;
        }

        // 9) Compound token: level prefix mashed with other data
        var compoundLevel = KnownLevels.FirstOrDefault(l => lower.StartsWith(l) && lower.Length > l.Length);
        if (compoundLevel != null)
        {
            var afterLevel = token.Substring(compoundLevel.Length);
            if (result.Level == null)
                result.Level = compoundLevel.ToUpperInvariant();
            ProcessToken(afterLevel, result, unmatched);
            return;
        }

        // 10) Unmatched — save for later
        unmatched.Add(token);
    }

    // ─── Standard Name Builder ─────────────────────────────────────

    private static string BuildStandardizedName(ParsedGroupName parsed)
    {
        var parts = new List<string> { "3C" };

        if (!string.IsNullOrEmpty(parsed.Level))
            parts.Add(parsed.Level);
        if (!string.IsNullOrEmpty(parsed.SubLevel))
            parts.Add(parsed.SubLevel.Replace(" ", ""));
        if (!string.IsNullOrEmpty(parsed.Track))
            parts.Add(parsed.Track);
        if (!string.IsNullOrEmpty(parsed.Course))
            parts.Add(parsed.Course);
        if (parsed.GroupNumber.HasValue)
            parts.Add(parsed.GroupNumber.Value.ToString());

        return string.Join(".", parts);
    }

    // ─── Confidence Score ──────────────────────────────────────────

    private static double CalculateConfidence(ParsedGroupName parsed)
    {
        double score = 0.0;
        if (!string.IsNullOrEmpty(parsed.Course)) score += 0.3;
        if (parsed.GroupNumber.HasValue) score += 0.2;
        if (!string.IsNullOrEmpty(parsed.Level)) score += 0.2;
        if (!string.IsNullOrEmpty(parsed.Track)) score += 0.1;
        if (parsed.ParsedDate.HasValue) score += 0.1;
        if (!string.IsNullOrEmpty(parsed.ParsedTime)) score += 0.05;
        if (!string.IsNullOrEmpty(parsed.Instructor)) score += 0.05;
        return Math.Min(score, 1.0);
    }

    /// <summary>
    /// Returns true if the raw title suggests the group is finished/completed.
    /// </summary>
    public static bool IsFinishedGroup(string? rawTitle)
    {
        if (string.IsNullOrWhiteSpace(rawTitle)) return false;
        var lower = rawTitle.ToLowerInvariant();
        return lower.Contains("finished") || lower.Contains("completed") ||
               lower.Contains("done") || lower.Contains("ended");
    }
}

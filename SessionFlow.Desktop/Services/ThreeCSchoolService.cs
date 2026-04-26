using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HtmlAgilityPack;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

/// <summary>
/// Service to scrape data from 3cschool.net panel and import into SessionFlow.
/// Handles login, group/student extraction, and database upsert.
/// </summary>
public class ThreeCSchoolService
{
    private readonly MongoService _db;
    private readonly SessionService _sessionService;
    private readonly ILogger<ThreeCSchoolService> _logger;

    public ThreeCSchoolService(MongoService db, SessionService sessionService, ILogger<ThreeCSchoolService> logger)
    {
        _db = db;
        _sessionService = sessionService;
        _logger = logger;
    }

    // ─── Data Transfer Objects ───────────────────────────────────────

    public class ImportResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public int GroupsFound { get; set; }
        public int GroupsImported { get; set; }
        public int StudentsImported { get; set; }
        public int SchedulesImported { get; set; }
        public List<GroupPreview> Groups { get; set; } = new();
    }

    public class GroupPreview
    {
        public string Name { get; set; } = "";            // MUST be the full raw 3C title
        public string? Raw3cTitle { get; set; }            // Duplicate for safety
        public string? NormalizedGroupName { get; set; }   // Lowercase collapsed version
        public string? CourseLabel { get; set; }           // e.g. "Mid.Semi pri.Unity 2"
        public string? Level { get; set; }
        public string? Schedule { get; set; }
        public int StudentCount { get; set; }              // Visible count from summary card
        public string? DetailUrl { get; set; }
        public string? SourceUrl { get; set; }             // Full URL to group page
        public List<StudentRecord> Students { get; set; } = new();
        public bool AlreadyExists { get; set; }

        // Deep import fields
        public string? SourceGroupId { get; set; }
        public string? InstructorName { get; set; }
        public int? TotalSessions { get; set; }
        public int? CompletedSessions { get; set; }
        public int? CurrentSessionNumber { get; set; }
        public string? ScheduleDay { get; set; }
        public string? ScheduleTime { get; set; }
        public string? ScheduleTimeRange { get; set; }
        public int? DurationMinutes { get; set; }
        public string GroupStatus { get; set; } = "active";
        
        // Validation & Sources
        public bool SemanticMismatch { get; set; }
        public double ConfidenceScore { get; set; } = 0.5;
        public List<string> Warnings { get; set; } = new();
        public string StudentFetchSource { get; set; } = "not-fetched";
        public string RawTitleSource { get; set; } = "summary-card";
    }

    public class StudentRecord
    {
        public string Name { get; set; } = "";
        public string? OptionValue { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? StudentId { get; set; }
    }

    // ─── Authentication ─────────────────────────────────────────────

    /// <summary>
    /// Logs into 3cschool.net and returns an authenticated HttpClient with session cookies.
    /// </summary>
    public async Task<(HttpClient? client, string? error)> LoginAsync(string email, string password)
    {
        HttpClient? client = null;
        try
        {
            var cookieContainer = new CookieContainer();
            var handler = new HttpClientHandler
            {
                CookieContainer = cookieContainer,
                AllowAutoRedirect = true,
                UseCookies = true
            };

            client = new HttpClient(handler)
            {
                BaseAddress = new Uri("https://3cschool.net"),
                Timeout = TimeSpan.FromSeconds(30)
            };

            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            client.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

            // Step 1: GET the login page to capture CSRF token
            var loginPageResponse = await client.GetAsync("/login");
            var loginPageHtml = await loginPageResponse.Content.ReadAsStringAsync();

            var doc = new HtmlDocument();
            doc.LoadHtml(loginPageHtml);

            // Extract CSRF token (Laravel uses _token hidden input)
            var tokenNode = doc.DocumentNode.SelectSingleNode("//input[@name='_token']");
            var csrfToken = tokenNode?.GetAttributeValue("value", "");

            if (string.IsNullOrEmpty(csrfToken))
            {
                _logger.LogWarning("Could find CSRF token on login page. Trying without it...");
            }

            // Step 2: POST login credentials
            var formData = new Dictionary<string, string>
            {
                { "email", email },
                { "password", password }
            };

            if (!string.IsNullOrEmpty(csrfToken))
            {
                formData["_token"] = csrfToken;
            }

            var content = new FormUrlEncodedContent(formData);
            var loginResponse = await client.PostAsync("/login", content);

            // Check if login succeeded (should redirect to panel, not back to login)
            var finalUrl = loginResponse.RequestMessage?.RequestUri?.ToString() ?? "";
            var responseBody = await loginResponse.Content.ReadAsStringAsync();

            if (finalUrl.Contains("/login") || responseBody.Contains("These credentials do not match"))
            {
                client.Dispose();
                return (null, "Invalid 3cschool.net credentials. Please check your email and password.");
            }

            _logger.LogInformation("Successfully logged into 3cschool.net");
            return (client, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to login to 3cschool.net");
            client?.Dispose();
            return (null, $"Connection failed: {ex.Message}");
        }
    }

    // ─── Scraping ───────────────────────────────────────────────────

    /// <summary>
    /// Fetches the "My Sessions" panel page and extracts group listings.
    /// </summary>
    public async Task<ImportResult> FetchGroupsPreviewAsync(HttpClient client, CancellationToken ct = default)
    {
        var result = new ImportResult();

        try
        {
            var response = await client.GetAsync("/panel/my-sessions", ct);
            var html = await response.Content.ReadAsStringAsync(ct);

            _logger.LogInformation("Fetched panel page ({Length} bytes)", html.Length);

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // Find group cards - broad but scoped
            var groupNodes = doc.DocumentNode.SelectNodes(
                "//div[contains(@class,'card')] | //div[contains(@class,'session')] | //div[contains(@class,'group')]"
            );

            if (groupNodes == null || groupNodes.Count == 0)
            {
                result.Error = "Could not detect group cards on the panel page.";
                return result;
            }

            foreach (var node in groupNodes)
            {
                // 1) Extract Raw 3C Title - Search attributes first (higher confidence)
                string? rawTitle = node.GetAttributeValue("data-title", null) 
                                 ?? node.GetAttributeValue("title", null)
                                 ?? node.SelectSingleNode(".//*[contains(@class,'title')]")?.InnerText;

                var textNodes = node.Descendants("#text")
                                   .Select(n => CleanText(n.InnerText))
                                   .Where(t => !string.IsNullOrWhiteSpace(t))
                                   .ToList();

                if (string.IsNullOrEmpty(rawTitle) || !Regex.IsMatch(rawTitle, @"^3c[\.\s:]", RegexOptions.IgnoreCase))
                    continue; // Skip non-3c groups

                var preview = new GroupPreview();

                // ─── CRITICAL: Name = Clean display label, Raw3cTitle = original exact full title ───
                preview.Name = DeriveCourseLabel(rawTitle)?.Replace(".", " ") ?? rawTitle; // Primary clean UI identity
                preview.Raw3cTitle = rawTitle;                    // Authoritative exact match source identity
                preview.NormalizedGroupName = NormalizeGroupName(rawTitle);
                preview.CourseLabel = DeriveCourseLabel(rawTitle); // Secondary derived field

                // 3) Group ID Resolution
                preview.SourceGroupId = ResolveGroupId(node);

                // 4) Schedule & Other details
                var scheduleIndex = textNodes.FindIndex(t => t.Equals("Schedule", StringComparison.OrdinalIgnoreCase));
                if (scheduleIndex >= 0 && textNodes.Count > scheduleIndex + 2)
                {
                    preview.ScheduleDay = textNodes[scheduleIndex + 1];
                    preview.ScheduleTimeRange = textNodes[scheduleIndex + 2];
                    preview.ScheduleTime = preview.ScheduleTimeRange.Split('-').FirstOrDefault()?.Trim();
                    preview.Schedule = $"{preview.ScheduleDay} {preview.ScheduleTimeRange}";
                }

                var sessionText = textNodes.FirstOrDefault(t => Regex.IsMatch(t, @"\d+\s+Sessions?", RegexOptions.IgnoreCase));
                if (sessionText != null)
                {
                    var m = Regex.Match(sessionText, @"(\d+)", RegexOptions.IgnoreCase);
                    if (m.Success) preview.TotalSessions = int.Parse(m.Groups[1].Value);
                }

                var studentCountText = textNodes.FirstOrDefault(t => Regex.IsMatch(t, @"\d+\s+Students?", RegexOptions.IgnoreCase));
                if (studentCountText != null)
                {
                    var m = Regex.Match(studentCountText, @"(\d+)", RegexOptions.IgnoreCase);
                    if (m.Success) preview.StudentCount = int.Parse(m.Groups[1].Value);
                }

                // Detail URL
                var link = node.SelectSingleNode(".//a[contains(@href, '/panel/')]");
                var href = link?.GetAttributeValue("href", "");
                if (!string.IsNullOrEmpty(href))
                {
                    var fullUrl = href.StartsWith("http") ? href : $"https://3cschool.net{href}";
                    preview.DetailUrl = fullUrl;
                    preview.SourceUrl = fullUrl;
                }

                // Check existence by strictly prioritized fields: SourceGroupId > SourceUrl > Raw3cTitle
                var existingGroup = await _db.Groups.Find(g => 
                    (g.SourceGroupId != null && g.SourceGroupId == preview.SourceGroupId && !g.IsDeleted) || 
                    (g.SourceUrl != null && g.SourceUrl == preview.SourceUrl && !g.IsDeleted) || 
                    (g.Raw3cTitle != null && g.Raw3cTitle == preview.Raw3cTitle && !g.IsDeleted)).FirstOrDefaultAsync(ct);
                
                preview.AlreadyExists = existingGroup != null;

                result.Groups.Add(preview);
            }

            result.GroupsFound = result.Groups.Count;
            result.Success = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch groups");
            result.Error = $"Scraping failed: {ex.Message}";
        }

        return result;
    }

    /// <summary>
    /// Phase 1 Utility: Dumps raw extraction points for specific selectors to verify parser logic.
    /// </summary>
    public async Task<List<object>> VerifySelectorsAsync(HttpClient client)
    {
        var samples = new List<object>();
        try
        {
            var response = await client.GetAsync("/panel/my-sessions");
            var doc = new HtmlDocument();
            doc.LoadHtml(await response.Content.ReadAsStringAsync());

            var groupNodes = doc.DocumentNode.SelectNodes("//div[contains(@class,'card')] | //div[contains(@class,'session')] | //div[contains(@class,'group')]");
            if (groupNodes == null) return samples;

            foreach (var node in groupNodes.Take(3))
            {
                var href = node.GetAttributeValue("href", null) ?? node.SelectSingleNode(".//*[@href]")?.GetAttributeValue("href", null);
                var rawTitle = node.GetAttributeValue("data-title", null) ?? node.GetAttributeValue("title", null) ?? node.SelectSingleNode(".//*[contains(@class,'title')]")?.InnerText;
                samples.Add(new {
                    raw3cTitle = rawTitle?.Trim(),
                    name = DeriveCourseLabel(rawTitle ?? "")?.Replace(".", " ") ?? rawTitle?.Trim(),
                    groupId = ResolveGroupId(node)
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "VerifySelectors failed");
        }
        return samples;
    }

    /// <summary>
    /// Authoritative source for group details and student list via the ticket-create page.
    /// </summary>
    public async Task<GroupPreview> FetchGroupDetailAsync(HttpClient client, GroupPreview group, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(group.SourceGroupId)) 
        {
            group.Warnings.Add("No Group ID found; skipping authoritative student fetch.");
            return group;
        }

        try
        {
            // The authoritative route for students
            var ticketUrl = $"/panel/course-group-tickets/{group.SourceGroupId}/create";
            var response = await client.GetAsync(ticketUrl, ct);
            var html = await response.Content.ReadAsStringAsync(ct);

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // 1) Verify/Enrich Raw Title from Ticket Page
            var ticketTitle = doc.DocumentNode.Descendants("#text")
                                .Select(n => CleanText(n.InnerText))
                                .FirstOrDefault(t => t.StartsWith("3c.", StringComparison.OrdinalIgnoreCase));
            
            if (!string.IsNullOrEmpty(ticketTitle))
            {
                if (ticketTitle != group.Raw3cTitle)
                {
                    group.Warnings.Add($"Title mismatch: Card '{group.Raw3cTitle}' vs Ticket '{ticketTitle}'");
                    group.RawTitleSource = "ticket-preferred";
                    group.Raw3cTitle = ticketTitle;
                }
                else
                {
                    group.RawTitleSource = "both-matched";
                }
            }

            // 2) Extract Instructor
            var instructorNode = doc.DocumentNode.SelectSingleNode("//*[contains(text(),'Instructor')]/following-sibling::*[1]")
                               ?? doc.DocumentNode.SelectSingleNode("//*[contains(@class,'instructor')]");
            group.InstructorName = CleanText(instructorNode?.InnerText);

            // 3) Extract Students from "Select Student *" dropdown
            var selectNode = doc.DocumentNode.SelectSingleNode(
                "//select[contains(@name,'student') or contains(@id,'student')]" +
                " | //select[contains(@class,'student')]" +
                " | //select[contains(@name,'user') and contains(@name,'id')]"
            );
            var options = selectNode?.SelectNodes(".//option[@value and @value!='']");

            if (options != null)
            {
                group.Students.Clear();
                foreach (var opt in options)
                {
                    var studentName = CleanText(opt.InnerText);
                    // Skip placeholders
                    if (string.IsNullOrWhiteSpace(studentName)) continue;
                    if (studentName.StartsWith("Select", StringComparison.OrdinalIgnoreCase)) continue;
                    if (studentName.StartsWith("Choose", StringComparison.OrdinalIgnoreCase)) continue;
                    if (studentName == "--" || studentName == "---") continue;
                    if (studentName.Contains("اختر")) continue; // Arabic placeholder

                    group.Students.Add(new StudentRecord {
                        Name = studentName,
                        OptionValue = opt.GetAttributeValue("value", "")
                    });
                }
                group.StudentFetchSource = "ticket-create-page";
            }
            else
            {
                group.Warnings.Add("Student dropdown not found on ticket page.");
            }

            // 4) Semantic Validation
            if (SemanticValidator(group.Raw3cTitle, group.Name))
            {
                group.SemanticMismatch = true;
                group.Warnings.Add("Semantic mismatch detected between Raw Title and Display Name.");
            }

            // 5) Final Confidence
            group.ConfidenceScore = CalculateConfidence(group);

            await Task.Delay(500); // Respectful scraping
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed authoritative fetch for group: {Id}", group.SourceGroupId);
            group.Warnings.Add($"Detail fetch failed: {ex.Message}");
        }

        return group;
    }

    private string? ResolveGroupId(HtmlNode node)
    {
        // Strategy 1: Extract from href attributes in the card
        var links = node.SelectNodes(".//a[@href]");
        if (links != null)
        {
            foreach (var link in links)
            {
                var href = link.GetAttributeValue("href", "");
                var match = Regex.Match(href, @"/(?:course-group|session|course-group-tickets)/(\d+)");
                if (match.Success) return match.Groups[1].Value;
            }
        }

        // Strategy 2: Data attributes
        return node.GetAttributeValue("data-id", null) 
            ?? node.GetAttributeValue("data-group-id", null);
    }

    private bool SemanticValidator(string? raw, string? display)
    {
        if (string.IsNullOrEmpty(raw) || string.IsNullOrEmpty(display)) return false;

        var rawLower = raw.ToLower();
        var displayLower = display.ToLower();

        // Level mismatch (Mid vs JR vs SR)
        var levels = new[] { "mid", "jr", "sr" };
        foreach (var lvl in levels)
        {
            if (rawLower.Contains(lvl))
            {
                foreach (var other in levels.Where(o => o != lvl))
                {
                    if (displayLower.Contains(other)) return true;
                }
            }
        }

        // Unity level mismatch
        var unityMatchRaw = Regex.Match(rawLower, @"unity\s*(\d)");
        var unityMatchDisplay = Regex.Match(displayLower, @"unity\s*(\d)");
        if (unityMatchRaw.Success && unityMatchDisplay.Success && 
            unityMatchRaw.Groups[1].Value != unityMatchDisplay.Groups[1].Value) return true;

        // Category mismatch (AR vs TS vs Reatt)
        if ((rawLower.Contains(".ar.") && displayLower.Contains(".ts.")) ||
            (rawLower.Contains(".ts.") && displayLower.Contains(".ar."))) return true;

        return false;
    }

    private double CalculateConfidence(GroupPreview group)
    {
        double score = 0.5;

        if (group.RawTitleSource == "both-matched") score += 0.2;
        if (group.StudentFetchSource == "ticket-create-page") score += 0.2;
        if (!group.SemanticMismatch) score += 0.1;
        if (!string.IsNullOrEmpty(group.SourceGroupId)) score += 0.05;
        
        if (group.Students.Count > 0 && Math.Abs(group.Students.Count - group.StudentCount) <= 1) score += 0.1;
        if (group.Students.Count == 0 && group.StudentCount > 0) score -= 0.3;

        return Math.Clamp(score, 0.0, 1.0);
    }

    private static string NormalizeGroupName(string rawTitle)
    {
        if (string.IsNullOrEmpty(rawTitle)) return "";
        var normalized = rawTitle.Trim().ToLowerInvariant();
        normalized = Regex.Replace(normalized, @"\s+", " ");
        normalized = Regex.Replace(normalized, @"\.{2,}", ".");
        return normalized;
    }

    private static string? DeriveCourseLabel(string? rawTitle)
    {
        if (string.IsNullOrEmpty(rawTitle)) return null;
        var segments = rawTitle.Split('.').ToList();
        // Remove "3c" prefix
        if (segments.Count > 0 && segments[0].Equals("3c", StringComparison.OrdinalIgnoreCase))
            segments.RemoveAt(0);
        // Remove date-like segments (6+ digits e.g. 11112025)
        segments.RemoveAll(s => Regex.IsMatch(s.Trim(), @"^\d{6,}$"));
        // Remove time-like segments (e.g. 7.30pm, 3pm, 9pm)
        segments.RemoveAll(s => Regex.IsMatch(s.Trim(), @"^\d{1,2}([.:.]\d{2})?(am|pm)$", RegexOptions.IgnoreCase));
        // Remove pure numeric IDs (4-5 digits)
        segments.RemoveAll(s => Regex.IsMatch(s.Trim(), @"^\d{4,5}$"));
        // Remove empty segments
        segments.RemoveAll(s => string.IsNullOrWhiteSpace(s));
        
        return segments.Count > 0 ? string.Join(".", segments.Select(s => s.Trim())) : null;
    }

    // ─── Import to Database ─────────────────────────────────────────

    // ─── Import to Database ─────────────────────────────────────────
 
    /// <summary>
    /// Full import pipeline: login → scrape → import to MongoDB.
    /// </summary>
    public async Task<ImportResult> ImportAllAsync(string email, string password, Guid engineerId, CancellationToken ct = default)
    {
        var result = new ImportResult();
        
        // Step 1: Login
        var (client, loginError) = await LoginAsync(email, password);
        if (client == null)
            return new ImportResult { Error = loginError };
 
        using (client)
        {
            // Step 2: Fetch groups preview
            result = await FetchGroupsPreviewAsync(client, ct);
            if (!result.Success)
                return result;
 
        // Step 3: Fetch details for each group
        for (int i = 0; i < result.Groups.Count; i++)
        {
            if (ct.IsCancellationRequested) break;
            result.Groups[i] = await FetchGroupDetailAsync(client, result.Groups[i], ct);
        }
 
        // Step 4: Import to database
        foreach (var groupPreview in result.Groups)
        {
            if (ct.IsCancellationRequested) break;
            if (groupPreview.AlreadyExists) continue;
            if (string.IsNullOrWhiteSpace(groupPreview.Name)) continue;
            
            // Smart parser: skip finished/completed groups
            if (GroupNameParser.IsFinishedGroup(groupPreview.Raw3cTitle))
            {
                _logger.LogInformation("Skipping finished group: {Name}", groupPreview.Raw3cTitle);
                continue;
            }
            
            // Parse the raw title into structured data
            var parsed = GroupNameParser.Parse(groupPreview.Raw3cTitle);
 
            try
            {
                // Create Group — Map DTO to domain model with smart parser output.
                var group = new SessionFlow.Desktop.Models.Group
                {
                    Name = parsed.DisplayName.Length > 0 ? parsed.DisplayName : groupPreview.Name,
                    Raw3cTitle = groupPreview.Raw3cTitle,
                    NormalizedGroupName = groupPreview.NormalizedGroupName,
                    StandardizedName = parsed.StandardizedName,
                    CourseLabel = groupPreview.CourseLabel,
                    SourceGroupId = groupPreview.SourceGroupId,
                    SourceUrl = groupPreview.SourceUrl,
                    InstructorName = parsed.Instructor ?? groupPreview.InstructorName,
                    Level = int.TryParse(new string(groupPreview.Level?.Where(char.IsDigit).ToArray() ?? Array.Empty<char>()), out var lvl) && lvl > 0 ? lvl : 1,
                    EngineerId = engineerId,
                    Status = GroupStatus.Active,
                    NumberOfStudents = groupPreview.Students.Count > 0 ? groupPreview.Students.Count : groupPreview.StudentCount,
                    Capacity = Math.Max(25, (groupPreview.Students.Count > 0 ? groupPreview.Students.Count : groupPreview.StudentCount) + 5),
                    TotalSessions = groupPreview.TotalSessions ?? 12,
                    CurrentSessionNumber = groupPreview.CurrentSessionNumber ?? 1,
                    StartingSessionNumber = 1,
                    ColorTag = AssignColorTag(result.GroupsImported),
                    // Smart parser fields
                    ParsedLevel = parsed.Level,
                    ParsedTrack = parsed.Track,
                    ParsedCourse = parsed.Course,
                    ParsedGroupNumber = parsed.GroupNumber,
                    ParsedInstructor = parsed.Instructor,
                    ParsedDate = parsed.ParsedDate,
                    ParsedTime = parsed.ParsedTime,
                    ParsedCode = parsed.Code
                };
 
                await _db.Groups.InsertOneAsync(group, cancellationToken: ct);
                result.GroupsImported++;
 
                // Create GroupSchedule if found
                if (!string.IsNullOrEmpty(groupPreview.ScheduleDay) && !string.IsNullOrEmpty(groupPreview.ScheduleTime))
                {
                    try
                    {
                        var dayMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                        {
                            {"Sunday", 0}, {"Monday", 1}, {"Tuesday", 2}, {"Wednesday", 3}, {"Thursday", 4}, {"Friday", 5}, {"Saturday", 6}
                        };
 
                        if (dayMap.TryGetValue(groupPreview.ScheduleDay, out var dayOfWeek))
                        {
                            var schedule = new GroupSchedule
                            {
                                GroupId = group.Id,
                                DayOfWeek = dayOfWeek,
                                StartTime = DateTime.Parse(groupPreview.ScheduleTime).TimeOfDay,
                                DurationMinutes = groupPreview.DurationMinutes ?? 60
                            };
                            await _db.GroupSchedules.InsertOneAsync(schedule, cancellationToken: ct);
                            result.SchedulesImported++;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse schedule for group: {Name}", groupPreview.Name);
                    }
                }
 
                // TRIGGER: Auto-generate sessions immediately after schedule/student insertion
                await _sessionService.AutoGenerateSessionsAsync(group, null, ct);
 
                // Create Students in batch
                var studentsToInsert = new List<Student>();
                foreach (var sp in groupPreview.Students)
                {
                    if (string.IsNullOrWhiteSpace(sp.Name)) continue;
 
                    studentsToInsert.Add(new Student
                    {
                        Name = sp.Name,
                        GroupId = group.Id,
                        StudentId = !string.IsNullOrWhiteSpace(sp.StudentId) ? sp.StudentId : sp.OptionValue,
                        UniqueStudentCode = Student.GenerateCode(sp.Name, group.Id)
                    });
                }
                
                if (studentsToInsert.Any())
                {
                    await _db.Students.InsertManyAsync(studentsToInsert, cancellationToken: ct);
                    result.StudentsImported += studentsToInsert.Count;
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Import operation was canceled.");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to import group: {Name}", groupPreview.Name);
            }
        }
 
        result.Success = true;
        
        await _db.Settings.UpdateOneAsync(
            Builders<Setting>.Filter.Eq(s => s.Key, "3c_last_import"),
            Builders<Setting>.Update
                .Set(s => s.Value, DateTimeOffset.UtcNow.ToString("o"))
                .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow),
            new UpdateOptions { IsUpsert = true },
            cancellationToken: ct
        );
 
        }
 
        return result;
    }
 
    /// <summary>
    /// Test connection only — login and check if we can access the panel.
    /// </summary>
    public async Task<(bool success, string? error, string? rawPreview)> TestConnectionAsync(string email, string password, CancellationToken ct = default)
    {
        var (client, loginError) = await LoginAsync(email, password);
        if (client == null)
            return (false, loginError, null);
 
        using (client)
        {
            try
            {
                var response = await client.GetAsync("/panel/my-sessions", ct);
                var html = await response.Content.ReadAsStringAsync(ct);
 
                // Save raw HTML for debugging
                await _db.Settings.UpdateOneAsync(
                    Builders<Setting>.Filter.Eq(s => s.Key, "3c_last_panel_html"),
                    Builders<Setting>.Update
                        .Set(s => s.Value, html.Substring(0, Math.Min(html.Length, 50000)))
                        .Set(s => s.UpdatedAt, DateTimeOffset.UtcNow),
                    new UpdateOptions { IsUpsert = true },
                    cancellationToken: ct
                );
 
                return (true, null, $"Connected successfully! Page length: {html.Length} characters.");
            }
            catch (OperationCanceledException)
            {
                return (false, "Operation canceled.", null);
            }
            catch (Exception ex)
            {
                return (false, $"Connected to 3cschool but failed to access panel: {ex.Message}", null);
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    private static string CleanText(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        return Regex.Replace(System.Net.WebUtility.HtmlDecode(text.Trim()), @"\s+", " ");
    }

    private static string AssignColorTag(int index)
    {
        var colors = new[] { "blue", "violet", "emerald", "amber", "rose", "cyan", "orange" };
        return colors[index % colors.Length];
    }
}

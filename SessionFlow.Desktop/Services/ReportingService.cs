using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Driver;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QuestPDF.Previewer;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Models;

namespace SessionFlow.Desktop.Services;

public class ReportingService
{
    private readonly MongoService _db;

    public ReportingService(MongoService db)
    {
        _db = db;
        // QuestPDF License (Community)
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public async Task<byte[]> GenerateSessionReportAsync(Guid sessionId)
    {
        var session = await _db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();
        if (session == null) throw new Exception("Session not found.");

        var group = await _db.Groups.Find(g => g.Id == session.GroupId).FirstOrDefaultAsync();
        var students = await _db.Students.Find(s => s.GroupId == session.GroupId && !s.IsDeleted).ToListAsync();
        var attendance = await _db.AttendanceRecords.Find(ar => ar.SessionId == sessionId).ToListAsync();
        var studentDict = students.ToDictionary(s => s.Id);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Verdana));

                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text("SESSION EXECUTION REPORT").FontSize(20).SemiBold().FontColor(Colors.Blue.Medium);
                        col.Item().Text($"{group?.Name}").FontSize(14).Medium();
                        col.Item().Text($"Level {group?.Level} · Deployment Node").FontSize(9).FontColor(Colors.Grey.Medium);
                    });

                    row.RelativeItem().AlignRight().Column(col =>
                    {
                        col.Item().Text($"SESSION #{session.SessionNumber}").FontSize(16).SemiBold();
                        col.Item().Text($"Executed: {session.EndedAt?.ToString("MMM dd, yyyy HH:mm") ?? "N/A"}").FontSize(10);
                        col.Item().Text("SessionFlow Core v1.2").FontSize(8).FontColor(Colors.Grey.Medium);
                    });
                });

                page.Content().PaddingVertical(1, Unit.Centimetre).Column(x =>
                {
                    x.Spacing(10);

                    // Metadata Grid
                    x.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn();
                            columns.RelativeColumn();
                        });

                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5).Text("Total Cadets");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5).AlignRight().Text($"{students.Count}");

                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5).Text("Attendance Status");
                        var present = attendance.Count(a => a.Status == AttendanceStatus.Present);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(5).AlignRight().Text($"{present} / {students.Count} Present");
                    });

                    x.Item().PaddingTop(10).Text("CADET ROSTER & TELEMETRY").FontSize(12).SemiBold().FontColor(Colors.Blue.Medium);

                    x.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(30);
                            columns.RelativeColumn();
                            columns.RelativeColumn();
                            columns.RelativeColumn();
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellStyle).Text("#");
                            header.Cell().Element(CellStyle).Text("Cadet Name");
                            header.Cell().Element(CellStyle).Text("Engineer ID");
                            header.Cell().Element(CellStyle).AlignRight().Text("Status");

                            static IContainer CellStyle(IContainer container)
                            {
                                return container.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Black);
                            }
                        });

                        int i = 1;
                        foreach (var record in attendance.OrderBy(r => studentDict.GetValueOrDefault(r.StudentId)?.Name))
                        {
                            studentDict.TryGetValue(record.StudentId, out var student);
                            table.Cell().Element(ContentStyle).Text($"{i++}");
                            table.Cell().Element(ContentStyle).Text($"{student?.Name ?? "Unknown"}");
                            table.Cell().Element(ContentStyle).Text($"{student?.StudentId ?? "N/A"}");
                            table.Cell().Element(ContentStyle).AlignRight().Text($"{record.Status}").FontColor(record.Status == AttendanceStatus.Present ? Colors.Green.Medium : Colors.Red.Medium);

                            static IContainer ContentStyle(IContainer container)
                            {
                                return container.BorderBottom(1).BorderColor(Colors.Grey.Lighten3).PaddingVertical(5);
                            }
                        }
                    });

                    if (!string.IsNullOrWhiteSpace(session.Notes))
                    {
                        x.Item().PaddingTop(20).Column(notes =>
                        {
                            notes.Item().Text("MISSION NOTES").FontSize(12).SemiBold().FontColor(Colors.Blue.Medium);
                            notes.Item().Padding(10).Background(Colors.Grey.Lighten4).Text(session.Notes).FontSize(9).Italic();
                        });
                    }
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }
}

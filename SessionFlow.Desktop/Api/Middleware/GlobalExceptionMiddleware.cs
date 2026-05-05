using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using Serilog;

namespace SessionFlow.Desktop.Api.Middleware;

/// <summary>
/// Global exception handler that catches all unhandled exceptions and returns
/// a standardized ApiError JSON response. Prevents stack trace leakage in production.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public GlobalExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            // Known application exceptions → appropriate HTTP codes
            ArgumentException argEx => (HttpStatusCode.BadRequest, argEx.Message),
            UnauthorizedAccessException => (HttpStatusCode.Forbidden, "Access denied."),
            KeyNotFoundException => (HttpStatusCode.NotFound, "Resource not found."),
            InvalidOperationException opEx => (HttpStatusCode.Conflict, opEx.Message),
            
            // MongoDB-specific errors
            MongoWriteException mwe when mwe.WriteError.Category == ServerErrorCategory.DuplicateKey
                => (HttpStatusCode.Conflict, "A record with this identifier already exists."),
            MongoCommandException => (HttpStatusCode.ServiceUnavailable, "Database temporarily unavailable."),
            
            // Rate limiting (if thrown manually via middleware)
            OperationCanceledException => (HttpStatusCode.TooManyRequests, "Too many requests. Please try again later."),

            // Everything else → 500 (hide details)
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred. Please try again.")
        };

        // Log the full exception server-side
        Log.Error(exception, "[GlobalExceptionHandler] {StatusCode} — {Path}",
            (int)statusCode, context.Request.Path);

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        var response = new
        {
            error = new
            {
                code = (int)statusCode,
                message,
                traceId = context.TraceIdentifier
            }
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

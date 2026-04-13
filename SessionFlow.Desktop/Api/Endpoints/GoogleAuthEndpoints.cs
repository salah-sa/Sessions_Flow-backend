using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Services;

namespace SessionFlow.Desktop.Api.Endpoints;

public static class GoogleAuthEndpoints
{
    public static void Map(WebApplication app)
    {
        var google = app.MapGroup("/api/admin/gmail").RequireAuthorization();

        // GET /api/admin/gmail/status — check if authorized
        google.MapGet("/status", async (GoogleAuthService auth, MongoService db) =>
        {
            var credential = await auth.GetUserCredentialAsync();
            var email = await db.Settings.Find(s => s.Key == "google_authorized_email").Project(s => s.Value).FirstOrDefaultAsync();
            return Results.Ok(new { 
                connected = credential != null,
                authorizedEmail = email
            });
        });

        // POST /api/admin/gmail/authorize — initiate browser OAuth flow
        google.MapPost("/authorize", async (GoogleAuthService auth, HttpContext ctx) =>
        {
            // For a desktop app, we usually use a local listener or a custom scheme
            // For simplicity in this hybrid app, we'll use the system browser and redirect back to our API
            var redirectUri = "http://localhost:5180/api/admin/gmail/callback";
            var url = await auth.GetAuthorizationUrlAsync(redirectUri);

            // Open the browser for the user
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });

            return Results.Ok(new { message = "Auth Window Launched. Complete sign-in in your system browser." });
        });

        // GET /api/admin/gmail/callback — receive OAuth code
        // IMPORTANT: In production, you would handle this via a more secure protocol (e.g. PKCE)
        google.MapGet("/callback", async (string? code, string? error, GoogleAuthService auth) =>
        {
            if (!string.IsNullOrEmpty(error))
                return Results.BadRequest(new { error });

            if (string.IsNullOrEmpty(code))
                return Results.BadRequest(new { error = "No authorization code provided." });

            var redirectUri = "http://localhost:5180/api/admin/gmail/callback";
            await auth.ExchangeCodeForTokenAsync(code, redirectUri);

            // Return a simple HTML page that closes itself or redirects to the app UI
            return Results.Content(@"
                <html>
                    <body style='background:#0f172a; color:white; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; overflow:hidden;'>
                        <div style='text-align:center;'>
                            <h1 style='color:#3b82f6;'>AUTHORIZATION SUCCESSFUL</h1>
                            <p>SessionFlow has intercepted the security token.</p>
                            <p style='color:#64748b;'>You can now close this tab and return to the application.</p>
                            <script>setTimeout(() => window.close(), 3000);</script>
                        </div>
                    </body>
                </html>", "text/html");
        });
    }
}

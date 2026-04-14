using System;
using System.IO;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Serilog;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using Microsoft.IdentityModel.Tokens;
using SessionFlow.Desktop.Api.Endpoints;
using SessionFlow.Desktop.Api.Hubs;
using SessionFlow.Desktop.Data;
using SessionFlow.Desktop.Services;
using SessionFlow.Desktop.Services.EventBus;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using System.Linq;

namespace SessionFlow.Desktop.Api;

public static class ApiHost
{
    public static WebApplication BuildAndConfigure(string[] args)
    {
        var baseDir = AppDomain.CurrentDomain.BaseDirectory;

        // Set ContentRoot and WebRoot BEFORE the builder initializes its internals.
        // This is critical for WPF-hosted apps where CWD != executable directory.
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            Args = args,
            ContentRootPath = baseDir,
            WebRootPath = Path.Combine(baseDir, "wwwroot")
        });

        // Ensure appsettings.json is loaded from the executable directory
        builder.Configuration.SetBasePath(baseDir);
        builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
        builder.Configuration.AddEnvironmentVariables();

        // Inject secrets from environment variables / .env file
        SecureBootstrapService.InjectSecrets(builder.Configuration);
        
        // Ensure Kestrel uses the correct port from configuration (defaulting to 5180)
        // Check for --port command line argument first for multi-instance support
        var kestrelUrl = builder.Configuration["Kestrel:Url"] ?? "http://127.0.0.1:5180";
        var portIdx = Array.IndexOf(args, "--port");
        if (portIdx >= 0 && portIdx < args.Length - 1)
        {
            kestrelUrl = $"http://127.0.0.1:{args[portIdx + 1]}";
        }
        builder.WebHost.UseUrls(kestrelUrl);

        // Configure Serilog
        builder.Host.UseSerilog((context, services, configuration) => configuration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .WriteTo.Console()
            .WriteTo.File(
                new Serilog.Formatting.Json.JsonFormatter(),
                "Logs/sessionflow-backend-json-.txt", 
                rollingInterval: RollingInterval.Day));

        // 1. Core Services - Singletons/Scoped
        builder.Services.AddHealthChecks()
            .AddCheck("MongoDB", new MongoHealthCheck(builder.Configuration));
            
        builder.Services.AddSingleton<MongoService>();
        
        // ── Redis Infrastructure (Graceful Fallback) ──────────────────
        var redisConnectionString = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";
        var redisInstanceName = builder.Configuration["Redis:InstanceName"] ?? "SessionFlow:";

        StackExchange.Redis.IConnectionMultiplexer? redisConnection = null;
        try
        {
            redisConnection = StackExchange.Redis.ConnectionMultiplexer.Connect(redisConnectionString);
            builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(redisConnection);
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning(ex, "Redis connection failed ({Conn}) — running in local-only mode", redisConnectionString);
        }

        // ── Presence Service (Redis with in-memory fallback) ──────────
        builder.Services.AddSingleton<IPresenceService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<RedisPresenceService>>();
            return new RedisPresenceService(redisConnection, logger, redisInstanceName);
        });

        // ── Event Bus (Redis Pub/Sub with local fallback) ─────────────
        builder.Services.AddSingleton<IEventBus>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<Services.EventBus.RedisEventBus>>();
            return new Services.EventBus.RedisEventBus(redisConnection, logger, redisInstanceName);
        });

        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<SessionService>();
        builder.Services.AddScoped<GmailSenderService>();
        builder.Services.AddScoped<SmtpEmailService>();
        builder.Services.AddScoped<SchedulingService>();
        builder.Services.AddScoped<AuditService>();
        builder.Services.AddScoped<NotificationService>();
        builder.Services.AddScoped<ThreeCSchoolService>();
        builder.Services.AddScoped<GmailSessionService>();
        builder.Services.AddScoped<GoogleAuthService>();
        builder.Services.AddScoped<ReportingService>();
        builder.Services.AddHostedService<EmailReminderService>();
        builder.Services.AddHostedService<SessionMaintenanceService>();
        
        // ── Event Dispatcher (Redis → SignalR Bridge) ─────────────────
        builder.Services.AddHostedService<Services.EventBus.EventDispatcher>();
        
        // ── SignalR + Redis Backplane ──────────────────────────────────
        var signalRBuilder = builder.Services.AddSignalR();
        if (redisConnection != null)
        {
            signalRBuilder.AddStackExchangeRedis(redisConnectionString, options =>
            {
                options.Configuration.ChannelPrefix = StackExchange.Redis.RedisChannel.Literal("SessionFlowSR");
            });
        }
        builder.Services.AddLogging();

        // 2. JWT Authentication
        var secretKey = builder.Configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey is not configured. Set SESSIONFLOW_JWT_SECRET environment variable.");
        var issuer = builder.Configuration["Jwt:Issuer"] ?? "SessionFlow";
        var audience = builder.Configuration["Jwt:Audience"] ?? "SessionFlow";

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey.Trim()))
                    {
                        KeyId = "SessionFlow-Primary-Key"
                    }
                };
                
                // Allow JWT for SignalR hub connection (passed in query string)
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

        builder.Services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
        });

        // 3. CORS — allow mobile and local origins for development
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("LocalOnly", policy =>
            {
                policy.SetIsOriginAllowed(_ => true) // Allow mobile devices on LAN during development
                      .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH")
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        var app = builder.Build();

        // 4. Pipeline Configuration
        app.UseCors("LocalOnly");
        app.UseMiddleware<RateLimitingMiddleware>();
        app.UseAuthentication();
        app.UseAuthorization();

        // Serve Static Files (Embedded React App in wwwroot)
        app.UseDefaultFiles();
        app.UseStaticFiles();

        // 5. Map Modular Endpoints
        AuthEndpoints.Map(app);
        GroupEndpoints.Map(app);
        StudentEndpoints.Map(app);
        SessionEndpoints.Map(app);
        DashboardEndpoints.Map(app);
        EngineerEndpoints.Map(app);
        TimetableEndpoints.Map(app);
        StationEndpoints.Map(app);
        SettingsEndpoints.Map(app);
        ChatEndpoints.Map(app);
        AttendanceEndpoints.Map(app);
        NotificationEndpoints.Map(app);
        AuditEndpoints.Map(app);
        ImportEndpoints.Map(app);
        GoogleAuthEndpoints.Map(app);
        ReportingEndpoints.Map(app);

        // 6. Map Real-time Hubs
        app.MapHub<SessionHub>("/hub");
        
        app.MapHealthChecks("/api/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
        {
            ResponseWriter = async (context, report) =>
            {
                context.Response.ContentType = "application/json";
                var mongoEntry = report.Entries.Values.FirstOrDefault();
                var mongoStatus = report.Entries.Count > 0 && mongoEntry.Status == HealthStatus.Healthy;
                var version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
                
                var response = new
                {
                    status = report.Status == HealthStatus.Healthy ? "ok" : "degraded",
                    database = mongoStatus ? "connected" : "disconnected",
                    version,
                    time = DateTimeOffset.UtcNow,
                    cairoTime = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(2))
                };
                
                await context.Response.WriteAsJsonAsync(response);
            }
        });

        // Fallback for SPA routing
        app.MapFallbackToFile("index.html");

        return app;
    }
}

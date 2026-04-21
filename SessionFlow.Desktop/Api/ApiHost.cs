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
        Console.WriteLine(">>> [STG 1] Initializing WebApplicationBuilder...");
        var isContainer = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true";
        var baseDir = AppDomain.CurrentDomain.BaseDirectory;

        // Set ContentRoot and WebRoot BEFORE the builder initializes its internals.
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            Args = args,
            ContentRootPath = baseDir,
            WebRootPath = Path.Combine(baseDir, "wwwroot")
        });

        Console.WriteLine(">>> [STG 2] Configuring Middleware & Environment...");
        // Ensure appsettings.json is loaded from the executable directory
        builder.Configuration.SetBasePath(baseDir);
        builder.Configuration.AddJsonFile("appsettings.json", optional: isContainer, reloadOnChange: true);
        builder.Configuration.AddEnvironmentVariables();

        // Inject secrets from environment variables / .env file
        SecureBootstrapService.InjectSecrets(builder.Configuration);
        
        // Ensure Kestrel uses the correct port from configuration
        if (isContainer)
        {
            var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
            var railwayPort = Environment.GetEnvironmentVariable("RAILWAY_PORT");
            var httpPorts = Environment.GetEnvironmentVariable("HTTP_PORTS");
            var aspnetUrls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
            Console.WriteLine($">>> [PORT DEBUG] PORT={port}, RAILWAY_PORT={railwayPort}, HTTP_PORTS={httpPorts}, ASPNETCORE_URLS={aspnetUrls}");
            Console.WriteLine($">>> [STG 2] Container Mode detected. Binding to 0.0.0.0:{port}");
            builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
        }
        else
        {
            var kestrelUrl = builder.Configuration["Kestrel:Url"] ?? "http://127.0.0.1:5180";
            var portIdx = Array.IndexOf(args, "--port");
            if (portIdx >= 0 && portIdx < args.Length - 1)
            {
                kestrelUrl = $"http://127.0.0.1:{args[portIdx + 1]}";
            }
            builder.WebHost.UseUrls(kestrelUrl);
        }

        Console.WriteLine(">>> [STG 3] Registering Core Services...");
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
            .AddCheck("MongoDB", new MongoHealthCheck(builder.Configuration))
            .AddCheck("Redis", new RedisHealthCheck(builder.Configuration));
            
        builder.Services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

        builder.Services.AddSingleton<MongoService>();
        builder.Services.AddSingleton<StorageService>();
        
        // ── Redis Infrastructure (Graceful Fallback) ──────────────────
        var redisConnectionString = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";
        
        // Ensure connection doesn't block startup in containers
        if (isContainer && !redisConnectionString.Contains("connectTimeout"))
        {
            redisConnectionString += ",connectTimeout=2000,abortConnect=false";
        }

        var redisInstanceName = builder.Configuration["Redis:InstanceName"] ?? "SessionFlow:";

        StackExchange.Redis.IConnectionMultiplexer? redisConnection = null;
        try
        {
            redisConnection = StackExchange.Redis.ConnectionMultiplexer.Connect(redisConnectionString);
            builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(redisConnection);
        }
        catch (Exception ex)
        {
            Console.WriteLine($">>> [WRN] Redis initialization skipped (not fatal): {ex.Message}");
            Serilog.Log.Warning(ex, "Redis connection failed ({Conn}) — running in local-only mode", redisConnectionString);
        }

        // ... (Remaining service registrations)
        builder.Services.AddSingleton<IPresenceService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<RedisPresenceService>>();
            return new RedisPresenceService(redisConnection, logger, redisInstanceName);
        });

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
        builder.Services.AddHostedService<Services.EventBus.EventDispatcher>();
        
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
        Console.WriteLine(">>> [STG 5] Configuring JWT & Auth...");
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
            options.AddPolicy("CanViewStudentRequests", policy => policy.RequireClaim("scope", "view:student_requests"));
            options.AddPolicy("CanApproveStudentRequests", policy => policy.RequireClaim("scope", "approve:student"));
            options.AddPolicy("CanViewAuditLogs", policy => policy.RequireClaim("scope", "view:audit_logs"));
            options.AddPolicy("CanManageEngineers", policy => policy.RequireClaim("scope", "manage:engineers"));
        });

        // 3. CORS — Production Hardening
        Console.WriteLine(">>> [STG 6] Configuring CORS...");
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("LocalOnly", policy =>
            {
                var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                    ?? new[] { "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:5180", "http://127.0.0.1:5180" };
                
                if (isContainer)
                {
                    // In container mode, also allow the Railway/deployed domain
                    policy.SetIsOriginAllowed(origin =>
                    {
                        if (allowedOrigins.Any(o => origin.StartsWith(o, StringComparison.OrdinalIgnoreCase))) return true;
                        // Allow same-origin requests (no Origin header = same origin)
                        return false;
                    });
                }
                else
                {
                    policy.WithOrigins(allowedOrigins);
                }
                
                policy.WithMethods("GET", "POST", "PUT", "DELETE", "PATCH")
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        var app = builder.Build();

        // ── CSRF: Validate X-Requested-With on mutating requests ──────
        app.Use(async (context, next) =>
        {
            var method = context.Request.Method;
            var isMutating = method == "POST" || method == "PUT" || method == "DELETE" || method == "PATCH";
            var path = context.Request.Path.Value ?? "";
            
            // Skip CSRF for auth endpoints (JWT-based, already rate-limited),
            // SignalR hub, health checks, and file uploads
            var isExempt = path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase) ||
                           path.StartsWith("/hub", StringComparison.OrdinalIgnoreCase) ||
                           path == "/ping" ||
                           path.StartsWith("/uploads", StringComparison.OrdinalIgnoreCase) ||
                           path.StartsWith("/api/admin/gmail/callback", StringComparison.OrdinalIgnoreCase);
            
            if (isMutating && !isExempt && !context.Request.Headers.ContainsKey("X-Requested-With"))
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new { error = "Missing CSRF header." });
                return;
            }
            
            await next();
        });

        // ── BARE-MINIMUM health ping (bypasses all auth/CORS) ──────────
        app.MapGet("/ping", () => Results.Ok(new { status = "alive", time = DateTime.UtcNow }));

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
                var version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
                
                // Build per-service status map dynamically
                var services = new Dictionary<string, string>();
                foreach (var entry in report.Entries)
                {
                    services[entry.Key.ToLowerInvariant()] = entry.Value.Status == HealthStatus.Healthy ? "connected" : "disconnected";
                }
                
                var response = new
                {
                    status = report.Status == HealthStatus.Healthy ? "ok" : "degraded",
                    services,
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

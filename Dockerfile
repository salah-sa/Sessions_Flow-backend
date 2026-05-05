# ═══════════════════════════════════════════════════════════
# SessionFlow Production Dockerfile — Hardened (A1/A2)
# ═══════════════════════════════════════════════════════════
# Stage 1: Frontend build (Node 20 Alpine)
# Stage 2: Backend build (.NET 9 SDK)
# Stage 3: Runtime (minimal, non-root)
# ═══════════════════════════════════════════════════════════

# Stage 1: Build the React frontend
FROM node:20-alpine AS build-ui
WORKDIR /app/ui
COPY sessionflow-ui/package*.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm ci --production=false && \
    # A2: Clean npm cache to reduce layer size
    npm cache clean --force
COPY sessionflow-ui/ ./
RUN npm run build

# Stage 2: Build the .NET backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build-backend
WORKDIR /app/src
COPY SessionFlow.Desktop/*.csproj SessionFlow.Desktop/
COPY HeadlessHost/*.csproj HeadlessHost/
RUN dotnet restore HeadlessHost/HeadlessHost.csproj
ARG CACHEBUST=1
COPY SessionFlow.Desktop/ SessionFlow.Desktop/
COPY HeadlessHost/ HeadlessHost/
RUN dotnet publish HeadlessHost/HeadlessHost.csproj -c Release -o /app/publish && \
    # A2: Remove SDK artifacts from publish output
    rm -rf /root/.nuget /root/.dotnet
# A1: Copy built frontend into published wwwroot
COPY --from=build-ui /app/ui/dist /app/publish/wwwroot/

# Stage 3: Runtime (Debian-based for full glibc + socket compatibility)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# A2: Create non-root user for security hardening
RUN adduser --system --no-create-home --group appuser

COPY --from=build-backend /app/publish .

# A2: Set ownership and drop privileges
RUN chown -R appuser:appuser /app
USER appuser

# Railway/Docker detection
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

ENTRYPOINT ["dotnet", "HeadlessHost.dll"]

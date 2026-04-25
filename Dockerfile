# Stage 1: Build the React frontend
FROM node:20-alpine AS build-ui
WORKDIR /app/ui
COPY sessionflow-ui/package*.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci
COPY sessionflow-ui/ ./
RUN npm run build

# Stage 2: Build the .NET backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build-backend
WORKDIR /app/src
COPY SessionFlow.Desktop/*.csproj SessionFlow.Desktop/
COPY HeadlessHost/*.csproj HeadlessHost/
RUN dotnet restore HeadlessHost/HeadlessHost.csproj
# Force cache refresh for source copy
ARG CACHEBUST=1
COPY SessionFlow.Desktop/ SessionFlow.Desktop/
COPY HeadlessHost/ HeadlessHost/
RUN dotnet publish HeadlessHost/HeadlessHost.csproj -c Release -o /app/publish
# Copy built frontend directly into the published directory for embedding
COPY --from=build-ui /app/ui/dist /app/publish/wwwroot/

# Stage 3: Runtime (Debian-based for full glibc + socket compatibility)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build-backend /app/publish .

# Railway/Docker detection
ENV DOTNET_RUNNING_IN_CONTAINER=true

ENTRYPOINT ["dotnet", "HeadlessHost.dll"]

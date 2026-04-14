# Stage 1: Build the React frontend
FROM node:20-alpine AS build-ui
WORKDIR /app/ui
COPY sessionflow-ui/package*.json ./
RUN npm ci
COPY sessionflow-ui/ ./
RUN npm run build

# Stage 2: Build the .NET backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build-backend
WORKDIR /app/src
COPY SessionFlow.Desktop/*.csproj SessionFlow.Desktop/
COPY HeadlessHost/*.csproj HeadlessHost/
RUN dotnet restore HeadlessHost/HeadlessHost.csproj
COPY SessionFlow.Desktop/ SessionFlow.Desktop/
COPY HeadlessHost/ HeadlessHost/
RUN dotnet publish HeadlessHost/HeadlessHost.csproj -c Release -o /app/publish
# Copy built frontend directly into the published directory for embedding
COPY --from=build-ui /app/ui/dist /app/publish/wwwroot/

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build-backend /app/publish .
# Default environment variables
ENV DOTNET_RUNNING_IN_CONTAINER=true
EXPOSE 8080
ENTRYPOINT ["dotnet", "HeadlessHost.dll"]

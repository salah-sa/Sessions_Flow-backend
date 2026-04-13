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
COPY SessionFlow.Desktop/*.csproj ./
RUN dotnet restore
COPY SessionFlow.Desktop/ ./
# Copy built frontend to backend wwwroot for embedding
COPY --from=build-ui /app/ui/dist ./wwwroot/
RUN dotnet publish -c Release -o /app/publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build-backend /app/publish .
# Default environment variables
ENV ASPNETCORE_URLS=http://+:5173
ENV DOTNET_RUNNING_IN_CONTAINER=true
EXPOSE 5173
ENTRYPOINT ["dotnet", "SessionFlow.Desktop.dll"]

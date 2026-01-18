FROM mcr.microsoft.com/dotnet/runtime:9.0-noble-chiseled AS base
USER app
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["NuGet.Config", "."]
COPY ["Novelytical.Worker/Novelytical.Worker.csproj", "Novelytical.Worker/"]
COPY ["Novelytical.Data/Novelytical.Data.csproj", "Novelytical.Data/"]
COPY ["Novelytical.Application/Novelytical.Application.csproj", "Novelytical.Application/"]
RUN dotnet restore "./Novelytical.Worker/Novelytical.Worker.csproj"
COPY . .
WORKDIR "/src/Novelytical.Worker"
RUN dotnet build "./Novelytical.Worker.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./Novelytical.Worker.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --chown=app:app --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Novelytical.Worker.dll"]

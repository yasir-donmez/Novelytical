FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER app
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["Novelytical.Web/Novelytical.Web.csproj", "Novelytical.Web/"]
COPY ["Novelytical.Data/Novelytical.Data.csproj", "Novelytical.Data/"]
RUN dotnet restore "./Novelytical.Web/Novelytical.Web.csproj"
COPY . .
WORKDIR "/src/Novelytical.Web"
RUN dotnet build "./Novelytical.Web.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./Novelytical.Web.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --chown=app:app --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Novelytical.Web.dll"]

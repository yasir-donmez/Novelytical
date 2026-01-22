FROM mcr.microsoft.com/dotnet/aspnet:9.0-noble-chiseled AS base
USER app
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["NuGet.Config", "."]
COPY ["Novelytical.Web/Novelytical.Web.csproj", "Novelytical.Web/"]
COPY ["Novelytical.Data/Novelytical.Data.csproj", "Novelytical.Data/"]
COPY ["Novelytical.Application/Novelytical.Application.csproj", "Novelytical.Application/"]
RUN dotnet restore "./Novelytical.Web/Novelytical.Web.csproj"
COPY . .
WORKDIR "/src/Novelytical.Web"
RUN dotnet build "./Novelytical.Web.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./Novelytical.Web.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Download Embedding Model directly (since it's gitignored)
RUN mkdir -p /app/publish/Resources/Embeddings/paraphrase-multilingual-MiniLM-L12-v2
RUN curl -L -o /app/publish/Resources/Embeddings/paraphrase-multilingual-MiniLM-L12-v2/model.onnx https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/onnx/model.onnx
RUN curl -L -o /app/publish/Resources/Embeddings/paraphrase-multilingual-MiniLM-L12-v2/sentencepiece.bpe.model https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/resolve/main/sentencepiece.bpe.model


FROM base AS final
WORKDIR /app
COPY --chown=app:app --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Novelytical.Web.dll"]

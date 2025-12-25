# Proje Yol Haritası (Novelytical)

## 1. Aşama: Altyapı ve DevOps (Temel)
- [x] **Loglama**: Serilog entegrasyonu + Seq (Docker üzerinde merkezi ve görsel log izleme).
- [x] **Config Yönetimi**: Geliştirme ortamı için .NET User Secrets, Canlı ortam için Environment Variables.
- [x] **Docker**: Web API, Worker Service ve PostgreSQL için Dockerfile ve docker-compose.yml.
- [x] **Health Checks**: Konteynerlerin ve Veritabanının ayakta olup olmadığını kontrol eden `/health` endpoint'i.
- [x] **Auto-Migration**: Uygulama ayağa kalkarken veritabanı tablolarının otomatik oluşturulması (Seed Data dahil).
- [x] **Test**: xUnit projesinin açılması ve "Vektör Benzerlik Algoritması"nın test edilmesi.
- [x] **CI Pipeline**: GitHub Actions ile her push işleminde testlerin otomatik çalıştırılması.

## 2. Aşama: Backend (API & Zeka)
- [ ] **Web API**: .NET 8 Web API projesinin oluşturulması (Clean Architecture yapısında).
- [ ] **DTO & AutoMapper**: Entity'lerin DTO'lara dönüştürülmesi.
- [ ] **Wrapper Class**: Tüm API cevaplarının standart formatta olması (`PagedResponse<T>`, `Response<T>`).
- [ ] **Service Layer**: İş mantığının Controller'dan servislere taşınması.
- [ ] **Validation**: Kullanıcı girdilerinin FluentValidation ile kontrolü.
- [ ] **Hybrid Search**: Full-Text (Kelime) + Vector (Anlam) aramanın RRF Algoritması ile birleştirilmesi.
- [ ] **Resiliency**: Polly ile dış servislere yapılan isteklerde hata toleransı.
- [ ] **Async Messaging**: MassTransit entegrasyonu (Başlangıçta In-Memory, ileride RabbitMQ).
- [ ] **Real-Time**: SignalR Hub kurulumu.
- [ ] **Global Exception Handler**: Hataların merkezi bir Middleware ile yakalanıp loglanması.
- [ ] **Rate Limiting**: API'yi aşırı yüklenmeye karşı koruma.
- [ ] **Swagger**: API Dokümantasyonu ve Test arayüzü.
- [ ] **Caching**: Redis (Distributed Cache) ile sık yapılan aramaların önbelleğe alınması.
- [ ] **Auth**: .NET Identity + JWT (HttpOnly Cookie).
- [ ] **CORS**: Frontend erişim izinlerinin ayarlanması.

## 3. Aşama: Frontend (Next.js & Modern UI)
- [ ] **Kurulum**: Next.js (App Router) + TypeScript.
- [ ] **UI Library**: shadcn/ui kurulumu.
- [ ] **Theme**: next-themes ile Karanlık/Aydınlık mod desteği.
- [ ] **API Client**: Axios + TanStack Query v5.
- [ ] **Forms**: React Hook Form + Zod.
- [ ] **Search Opt**: useDebounce hook'u ve URL tabanlı arama yönetimi.
- [ ] **Tasarım**: Tailwind CSS + clsx + tailwind-merge.
- [ ] **Components**: NovelCard, SearchBar, Pagination, Layout.
- [ ] **UX**: Skeleton Loading.
- [ ] **Security**: Next.js Middleware (HttpOnly Cookie okuma ve rota koruma).
- [ ] **SEO**: Dinamik Metadata ve Open Graph.
- [ ] **State Management**: Zustand.

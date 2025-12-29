# 🚀 Novelytical Proje Durumu

## ✅ TAMAMLANAN AŞAMALAR (Phase 1 & 2)

### Aşama 1: Altyapı (Infrastructure)
- [x] **DevOps**: Docker, Docker Compose, CI Hattı.
- [x] **Veritabanı**: PostgreSQL + pgvector, Otomatik Migrasyonlar.
- [x] **Loglama**: Serilog + Seq.
- [x] **Sağlık Kontrolleri**: `/health` uç noktası.

### Aşama 2: Backend Mimarisi ve Yapay Zeka (Clean Comp + AI)
- [x] **Hibrit Arama**: Full-Text (PostgreSQL tsvector) + Vektör (Anlamsal) + RRF.
- [x] **Dayanıklılık**: Polly (Timeout, Retry, Fallback).
- [x] **Mimari**: Clean Architecture (Web, Application, Data, Worker).
- [x] **API**: .NET 9 REST API, Swagger, Global Hata Yönetimi.
- [x] **Performans**: Projection, AsNoTracking, Memory Cache, Rate Limiting.
- [x] **Güvenlik**: CORS, User Secrets (Yapılandırma Yönetimi).
- [x] **[YENİ] Çok Dilli Destek (Multilingual Support)**:
    - `SmartComponents` yerine `Microsoft.ML.OnnxRuntime` entegrasyonu.
    - `paraphrase-multilingual-MiniLM-L12-v2` modeli ile Türkçe destekli anlamsal arama.
    - Özel Tokenizer implementasyonu ve Worker Re-indexing optimizasyonu (Paralel İşleme).

---

## 🎯 ŞU ANKİ ODAK: Aşama 3 (Frontend & Modern UI)
> **Hedef:** Next.js 14+ (App Router) kullanarak yüksek performanslı ve modern bir arayüz oluşturmak.

- [x] **Kurulum**: Next.js (App Router) + TypeScript kurulumu.
- [x] **UI Kütüphanesi**: shadcn/ui kurulumu.
- [x] **Tema**: next-themes ile Karanlık/Aydınlık mod desteği.
- [x] **API İstemcisi**: Axios + TanStack Query v5 entegrasyonu.
- [x] **Arama Optimizasyonu**: URL tabanlı arama yönetimi ve useDebounce.
- [x] **Sayfalama (Pagination)**: URL tabanlı sayfa yönetimi ve navigasyon kontrolleri.
- [x] **Tasarım**: Tailwind CSS + clsx + tailwind-merge.
- [x] **Bileşenler**: NovelCard, NovelCardSkeleton, SearchBar, Pagination.
- [x] **Ana Sayfa**: Novel Listesi ve Arama Fonksiyonalitesi (Türkçe/İngilizce destek).
- [x] **Detay Sayfası**: Novel Detay Sayfası (Next.js 15 uyumlu).
- [x] **Pagination**: Sayfalama kontrolleri (URL tabanlı sayfa yönetimi).

- [x] **Güvenlik**: Next.js Middleware (HttpOnly Cookie okuma ve rota koruma).
- [x] **SEO**: Dinamik Metadata ve Open Graph ayarları.

---

## ⏳ BEKLEYEN: Aşama 4 (Topluluk, Auth ve İleri Backend)
> **Hedef:** Kullanıcı etkileşimi, yorumlar ve gelişmiş backend özellikleri.

- [ ] **Kimlik Doğrulama (Auth)**:
    - .NET Identity + JWT (HttpOnly Cookie) altyapısı.
    - Kayıt Ol (Register) ve Giriş Yap (Login) sayfaları.
    - React Hook Form + Zod validasyonları (Login/Register formları için).
- [ ] **Topluluk Özellikleri [YENİ]**:
    - Roman detay sayfalarına Yorum/Sohbet bölümü.
    - Puanlama ve Değerlendirme sistemi.
    - Kullanıcı Profili yönetimi.
- [ ] **Gelişmiş Öneri Sistemi (Graph AI)**:
    - PostgreSQL **Apache AGE** eklentisi entegrasyonu.
    - Romanlar ve Etiketler arası Graf tabanlı ilişki analizi.
    - "Bunları da beğenebilirsiniz" öneri motoru.
- [ ] **Akıllı Sorgu Genişletme (Query Expansion) [YENİ]**: Türkçe aramaları İngilizce terimlerle (örn: Kılıç -> Sword) zenginleştirerek Klasik Aramayı güçlendirme.
- [ ] **Asenkron Mesajlaşma**: MassTransit (RabbitMQ) entegrasyonu.
- [ ] **Gerçek Zamanlı İletişim**: SignalR Hub (Bildirimler/Sohbet için).
- [ ] **İzleme (Monitoring)**: ELK Stack veya Prometheus + Grafana.

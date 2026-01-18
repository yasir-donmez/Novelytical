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
- [/] **Geri Yükleme Kontrolü**: Kullanıcı tarafından sağlanacak görev listesinin kontrolü ve uygulanması.
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
- [x] **Performans**: Novel detay sayfasında ISR (60sn cache) kullanımı.

- [x] **Güvenlik**: Next.js Middleware (HttpOnly Cookie okuma ve rota koruma).
- [x] **SEO**: Dinamik Metadata, Open Graph ve JSON-LD (Structured Data) ayarları.
- [~] **PPR (Partial Prerendering)**: ~*(Build sorunu nedeniyle geri alındı)*~.


---

## 🎨 DEVAM EDEN: Aşama 3.5 (Frontend Polish & UX İyileştirmeleri)
> **Hedef:** Phase 4'e geçmeden önce frontend'i profesyonel seviyeye çıkarmak

### 3.5.1: Detay Sayfası İyileştirmeleri
- [x] Etiketler tıklanabilir (tag'e tıklayınca o etiketle filtreleme)
- [x] Rating gösterimi (yıldızlar + ortalama puan)
- [x] Sosyal paylaşım butonları (Twitter, Facebook)
- [x] Yazarın diğer romanları bölümü
- [x] Benzer romanlar önerisi (AI powered - vector similarity)

- [x] **Kategori (Etiket) Filtreleri:**
  - [x] Tag listesi API endpoint (`GET /api/tags`)
  - [x] Frontend Dropdown/Multi-select component
  - [x] URL state ile entegrasyon
- [~] **Yıl Aralığı Filtresi:** ~*(İptal Edildi)*~
- [x] **Sıralama Seçenekleri:**
  - En yeni (tarih)
  - En popüler (bölüm sayısı)
  - Alfabetik
  - Puana göre (artan/azalan)
  - URL parametrelering (en yüksek puan)
- [x] **Filtre State'i:**
  - [x] URL query params ile kalıcılık
  - [x] Clear all filters butonu
  - [x] Active filters badge gösterimi

### 3.5.3: UI/UX İyileştirmeleri
- [x] **Loading States:**
  - [x] Novel card skeleton (mevcut)
  - [x] Detail page skeleton
  - [x] Filter dropdown skeleton
- [x] **Empty States:**
  - [x] "Arama sonucu bulunamadı" ekranı
  - [x] "Bu kategoride roman yok" mesajı
  - [x] Öneri butonları (filtreyi temizle, ana sayfaya dön)
- [ ] **Error Boundary:**
  - Global error boundary component
  - 404 sayfası (novel bulunamadı)
  - 500 error fallback
  - Network error handling
- [x] **Animations:**
  - [x] Scroll-triggered fade-in (framer-motion veya CSS)
  - [x] Hover card lift effect (mevcut shine'a ek)
  - Page transition animations
  - Filter collapse/expand animations

### 3.5.4: Error Handling & Monitoring ✅
- [x] **Sentry Integration:**
  - [x] Install @sentry/nextjs
  - [x] Sentry config files (client, server, edge)
  - [x] Environment variables (DSN)
  - [x] next.config.ts integration
- [x] **Custom Error Types:**
  - [x] AppError base class
  - [x] NetworkError, NotFoundError, ValidationError, ServerError
  - [x] Error handler utility (lib/errors/handler.ts)
- [x] **Toast Notifications:**
  - [x] Sonner integration
  - [x] Axios interceptor for network errors
  - [x] Error handler with toast display
- [x] **Enhanced Error Boundaries:**
  - [x] Global error.tsx with Sentry integration
  - [x] "Report Problem" button (Sentry feedback widget)
  - [x] Error type detection and user-friendly messages
- [x] **Specific Error Handling:**
  - [x] Novel detail 404 handling (notFound() function)
  - [x] Network error handling with retry logic
  - [x] TanStack Query global error handling
  - [x] Retry utility function (lib/utils/retry.ts)

**Note:** Toast notifications work in client components. Server-side errors show console logs + Sentry tracking + error messages on page.

### 3.5.5: Accessibility (a11y)& Accessibility
- [ ] **Mobil Optimizasyon:**
  - Touch-friendly button sizes (44x44px minimum)
  - [x] **Responsive Grid & Card Layouts:**
    - [x] Tablet/Foldable (640px-768px): 2-Column Horizontal Grid.
    - [x] Mobile (<640px): Single Column Horizontal.
    - [x] Desktop (>768px): Multi-column Vertical.
  - [x] **Card Refinements:**
    - [x] Mobile/Tablet kartlarına etiket (tag) eklendi.
    - [x] "Super Minion" gibi devasa kart sorunu çözüldü (Horizontal layout scaling).
    - [x] **Detail Page Carousel:** Vertical Center-Snap on Mobile, Double Grid on Tablet.
    - [x] **Polish:** Desktop Card Heights fixed & Skeletons synced.
  - [x] **Top Section Layout:**
    - [x] Refine breakpoints: adjusted to `min-[550px]` to fix intermediate range.
  - [x] **Main Page Layout:**
    - [ ] Mobile: Horizontal Carousel (Netflix style) for the main list.
    - [ ] Desktop: Keep existing Grid.
  - [ ] Swipeable card carousel (mobilde)
  - [x] Bottom sheet filters (mobil)
    - [x] Install `vaul`
    - [x] Create `components/ui/drawer.tsx`
    - [x] Create `hooks/use-media-query.ts`
    - [x] Refactor `CategoryModal` to use Drawer on Mobile
  - [ ] Hamburger menu (ileride navbar için)
- [ ] **Keyboard Navigation:**
  - Tab order optimization
  - Escape key handlers (modal/filter close)
  - Arrow key navigation (card grid)
- [ ] **Accessibility (a11y):**
  - ARIA labels (tüm interactive elementler)
  - Alt text (tüm görseller)
  - Focus indicators (outline)
  - Color contrast check (WCAG AA)
  - Screen reader testing

### 3.5.5: Performance Optimizations
- [ ] Image optimization (next/image zaten var, lazy loading kontrol)
- [ ] Code splitting (route-based)
- [ ] Prefetching (link hover'da)
- [ ] Bundle size analizi (next-bundle-analyzer)
- [ ] Lighthouse performance score ≥90

### 3.5.6: Kullanıcı Ayarları Sayfası [YENİ]
- [x] **Ayarlar Sayfası (`/settings`)**:
  - [x] Sekmeli yapı (Profil, Görünüm, Hesap).
  - [x] Profil güncelleme formu.
  - [x] Tema ayarları.
  - [x] Hesap silme fonksiyonu.
  - [x] Bildirim Ayarları (Tercihler) [YENİ].
- [x] **Seviye Sistemi (Gamification) [YENİ]**:
  - [x] `level-service.ts` (XP kazanım mantığı).
  - [x] Firestore kullanıcı şeması güncellemesi (xp, level).
  - [x] Profil sayfasında Level/XP Bar gösterimi.
  - [x] Okuma ve etkileşimlere XP entegrasyonu.
  - [/] **Çerçeve Sistemi (Frames)**:
    - [x] Profil düzenleme ekranında çerçeve seçimi UI.
    - [x] Seviye artırma (Debug/Test amacı ile) fonksiyonu.
    - [x] Çerçeve önizleme ve kilit açma görselleştirmesi.
    - [x] **Global Çerçeve Entegrasyonu**:
      - [x] Feed/Post servisi ve UI entegrasyonu.
      - [x] Yorumlar servisi ve UI entegrasyonu.
      - [x] İncelemeler servisi ve UI entegrasyonu.
      - [x] Bildirim sistemi entegrasyonu.
      - [x] Profil güncelleme senkronizasyonu.


---


## ⏳ BEKLEYEN: Aşama 4 (Authentication & Hybrid Mimari) 🔐
> **Hedef:** Firebase Auth + Firestore (yorumlar) + PostgreSQL (romanlar) + CQRS Pattern


### 4.1: CQRS Pattern Migration
- [x] Altyapı: MediatR kütüphanesinin kurulması.
- [x] Refactoring: `NovelService`'in Command/Query'lere parçalanması.
- [x] Implement: `GetNovelByIdQuery`
- [x] Implement: `GetNovelsQuery` (RRF + Hybrid Search)
- [x] Implement: `GetNovelsByAuthorQuery`
- [x] Implement: `GetSimilarNovelsQuery`
- [x] Implement: `GetAllTagsQuery`
- [x] Controllers'ı MediatR kullanacak şekilde güncelle

### 4.2: Firebase Authentication (✅ TAMAMLANDI)
- [x] Firebase projesi oluştur (Console)
- [x] Frontend: Firebase SDK entegrasyonu (lib/firebase.ts)
- [x] Frontend: Auth Context ve Login/Register sayfaları
- [x] Frontend: Google Sign-In entegrasyonu
- [x] Backend: Firebase Admin SDK kurulumu
- [x] Backend: JWT Bearer Token doğrulama middleware
- [x] Entegrasyon: Token'ın request header'a eklenmesi (Axios interceptor)
- [x] **BUG FIX**: Google Login Redirect Loop ve Deprecation Warning Çözümü (Popup'a geçildi + fetch kullanıldı)
- [x] **[YENİ] User Sync:** Firebase kullanıcılarını PostgreSQL 'Users' tablosuna eşitleme altyapısı (Migration hazır).

### 4.3: Firestore Comments (Hybrid DB)
- [x] Firestore veritabanı kurulumu (Console)
- [x] Frontend: `CommentService` (add, get, delete)
- [x] UI: `CommentSection`, `CommentList`, `CommentItem`
- [x] Entegrasyon: Roman detay sayfasına ekleme
- [ ] Security Rules: Sadece giriş yapanlar yazabilir, sahibi silebilir(CQRS)
- [ ] **Bildirim Sistemi (Notifications)**:
  - [ ] Yorum beğeni/beğenmeme bildirimi (like/dislike notifications)
  - [ ] Yorum yanıtlama bildirimi (reply notifications)
  - [ ] Mention bildirimi (zaten var mı kontrol et)
  - [ ] Firestore `notifications` koleksiyonu ve servis yapısı
  - [x] Frontend: Bildirim gösterimi ve okundu/okunmadı durumu
- [ ] Favoriler (AddFavoriteCommand, GetFavoritesQuery)
- [ ] Rating (RateNovelCommand, GetUserRatingQuery)
- [ ] User profile
  - [ ] Kullanıcı profil sayfası (`/profile/[id]` veya benzeri)
  - [ ] Başkasının profilini görme
  - [ ] Takipleşme Sistemi (Follow/Unfollow)
  - [ ] Karşılıklı Takip (Mutual) kontrolü
  - [ ] Profil Gizliliği (Sadece takipleşenler kütüphaneyi görebilir)

### Sosyal & Mesajlaşma (Phase 5)
- [/] Backend: Follow Service (Takip et, Bırak, Listele)
- [/] Backend: Chat Service (Mesaj gönder, Real-time dinle)
- [ ] UI: Settings -> "Görünüm" yerine "Bağlantılar" (Takipçilerim/Takip Ettiklerim)
- [ ] UI: Profil Sayfası -> Takip Et butonu ve Sayaçlar
- [ ] UI: Global Chat Dialog (Sağ alt köşe, Instagram tarzı)
- [ ] Logic: Sadece karşılıklı takipleşenler mesajlaşabilir

### 4.4: AI Moderasyon ve İçerik Güvenliği [YENİ]
- [ ] **AI Tabanlı Argo ve Küfür Tespiti**:
  - [ ] Backend: ML.NET veya ONNX tabanlı küfür filtreleme servisi.
  - [ ] Model: Türkçe için optimize edilmiş NLP modeli entegrasyonu.
  - [ ] Entegrasyon: Yorum ve inceleme gönderimi sırasında otomatik denetim.
- [ ] **AI tabanlı Spoiler Tespiti**:
  - [ ] Backend: İçerik analizi yaparak potansiyel spoiler tespiti.
  - [ ] Frontend: Spoiler olarak işaretlenen içeriğin otomatik olarak bulanıklaştırılması.
  - [ ] UI: Kullanıcıya "Spoiler tespit edildi" uyarısı veya otomatik gizleme seçeneği.

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
- [x] **Önbellekleme (Caching)**: Redis entegrasyonu (Distributed Cache & Rate Limiting için).
- [ ] **Yedekleme (Backup)**: Veritabanı ve Blob Storage otomatik yedekleme stratejisi.
- [x] **Frontend Deployment**: Next.js uygulamasını Dockerize et (Standalone Output).
- [x] **Reverse Proxy**: Nginx kurulumu tamamlandı (SSL Termination & Port Security).
- [x] **CI/CD Pipeline**: GitHub Actions ile Docker Build -> Push to GHCR tamamlandı.
- [x] **Migration Check**: `SiteViewCount` vb. kolonların migration dosyasının oluşturulduğundan emin ol (`CleanUpSchema` oluşturuldu).

 Önemli Hatırlatma: Şu an appsettings.Production.json dosyasında izin verilen site olarak https://your-production-domain.com (yer tutucu) yazıyor.

Canlıya çıkmadan önce bu adresi kendi gerçek domaininizle (örn: https://novelytical.com) değiştirmeniz ŞART. Aksi takdirde siteniz backend'e istek atamaz ve "CORS Error" alırsınız. Bu bir güvenlik açığı değil, bir yapılandırma gerekliliğidir.

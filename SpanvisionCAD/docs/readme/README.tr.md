> Spanvision Infra distribution links are not configured yet. Use the supplied source directory and the current build instructions in [the main README](../../README.md).

<p align="center">
  <a href="../../README.md">English</a> · <a href="README.bg.md">Български</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.cs.md">Čeština</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.fr.md">Français</a> · <a href="README.fi.md">Suomi</a> · <a href="README.de.md">Deutsch</a> · <a href="README.el.md">Ελληνικά</a> · <a href="README.hu.md">Magyar</a> · <a href="README.it.md">Italiano</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.pl.md">Polski</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.es.md">Español</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a>
</p>

<p align="center"><img src="../../assets/logo.svg" width="112" alt="CAD — Spanvision Infra logosu"></p>

<h1 align="center">CAD — Spanvision Infra</h1>

<p align="center">Rust ile geliştirilen, masaüstü ve web için açık kaynaklı 2B çizim ve 3B modelleme uygulaması.</p>




## Genel bakış

CAD — Spanvision Infra; teknik çizim, pafta düzenleme ve katı modelleme için platformlar arası bir uygulamadır. DWG ve DXF çizimlerini doğrudan okur ve yazar; masaüstü ile tarayıcı sürümleri aynı düzenleme çekirdeğini paylaşır.


## Öne çıkanlar

- **Doğrudan çizim iş akışı** — dönüştürme hizmeti olmadan DWG ve DXF dosyalarını açın, düzenleyin, kurtarın ve kaydedin.
- **Hassas 2B çizim** — çizgiler, çoklu çizgiler, eğriler, spline'lar, taramalar, nesne yakalama, izleme, katmanlar, bloklar ve dış referanslar.
- **Belgelendirme araçları** — metin, ölçülendirme, kılavuzlar, toleranslar, tablolar, model alanı, kağıt alanı, görünüm pencereleri ve çizim stilleri.
- **Çekirdek destekli 3B modelleme** — katı temel şekiller, ekstrüzyon, döndürme, süpürme, loft, Boolean işlemleri ve ACIS varlık mozaiklemesi.
- **GPU ile görüntüleme** — `wgpu` üzerinden hızlandırılmış 2B ve 3B görünüm pencereleri; ortografik ve perspektif kameralar.
- **Genişletilebilir iş akışları** — yerel eklentiler, komut betikleri, arayüzsüz dönüştürme ve satır tabanlı JSON otomasyon API'si.


## Dosya iş akışları

| Biçim veya iş akışı | Destek |
| --- | --- |
| DWG | Okuma ve yazma; R14 ile 2018 arasında sürümlü kaydetme hedefleri |
| DXF | Okuma ve yazma; R14 ile 2018 arasında sürümlü kaydetme hedefleri |
| BAK / SV$ | Çizim yedeklerini ve otomatik kayıt dosyalarını açma |
| OBJ | Çokgen ağlarını içe aktarma |
| LandXML | `CgPoint` ölçüm noktalarını içe aktarma |
| STL | 3B ağ verilerini dışa aktarma |
| STEP AP203 | 3B ağ verilerini dışa aktarma |
| PDF | Masaüstünde paftaları ve seçili geometrileri çizdirme |
| CSV | Varlık özellik verilerini çıkarma |
| CTB / STB | Çizim stili tablolarını yükleme ve düzenleme |

## Masaüstü mü, web mi?

Kurulum yapmadan hemen başlamak için web uygulamasını kullanın. Çizimler tarayıcı üzerinden seçilir ve yerel indirme olarak kaydedilir.

Yerel dosya ilişkilendirmeleri, dosya yöneticisi küçük resimleri, sistem yazdırması, PDF çıktısı, harici eklentiler, komut betikleri ve arayüzsüz otomasyon için masaüstü uygulamasını kullanın. Windows, Linux ve Apple Silicon macOS için sürüm derlemeleri sunulur.

## Kurulum

Güncel paketlerin tamamını son sürümden indirin.

### Windows

İmzalı x86-64 paketlerinden birini seçin:

- `SpanvisionCAD-*-windows-x86_64-installer.msi` — Başlat menüsü kısayolları, DWG/DXF dosya ilişkilendirmeleri ve çizim küçük resimleri içeren önerilen kurucu.
- `SpanvisionCAD-*-windows-x86_64-portable.exe` — kurulum gerektirmeyen bağımsız uygulama.

### Linux

x86-64 AppImage dosyasını indirin, çalıştırılabilir yapın ve başlatın:

```bash
chmod +x SpanvisionCAD-*-linux-x86_64.AppImage
./SpanvisionCAD-*-linux-x86_64.AppImage
```

### macOS

Yayımlanan macOS paketi Apple Silicon'ı destekler:

1. `SpanvisionCAD-*-macos-arm64.dmg` dosyasını indirin.
2. Disk imajını açın ve `SpanvisionCAD.app` uygulamasını **Applications** klasörüne sürükleyin.
3. Gatekeeper ilk çalıştırmayı engellerse uygulamayı **System Settings → Privacy & Security** bölümünden onaylayın.

Uygulama geçici imzaya sahiptir ancak şu anda Apple tarafından noterlenmemiştir.

## Diller

CAD — Spanvision Infra sistem dilini izleyebilir veya şu 21 arayüz dilinden birini kullanabilir:

> Arapça · Brezilya Portekizcesi · Bulgarca · Çekçe · Felemenkçe · İngilizce · Fince · Fransızca · Almanca · Yunanca · Hintçe · Macarca · İtalyanca · Japonca · Korece · Lehçe · Rusça · Basitleştirilmiş Çince · İspanyolca · Geleneksel Çince · Türkçe

Dili uygulama ayarlarından değiştirin. **Sistem** seçildiğinde tarayıcı sürümü de tarayıcının tercih ettiği yerel ayarı kullanır.

## Kaynaktan derleme

### Masaüstü

Gereksinimler:

- Git
- Güncel kararlı Rust araç zinciri
- Platforma ait grafik ve yazı tipi geliştirme kitaplıkları

Ubuntu veya Debian'da yerel bağımlılıkları yükleyin:

```bash
sudo apt update
sudo apt install libgl1-mesa-dev libx11-dev libxcursor-dev libxi-dev \
  libxrandr-dev libxkbcommon-dev libwayland-dev libfontconfig1-dev \
  libfreetype6-dev
```

Ardından derleyin:

```bash
cd SpanvisionCAD
cargo build --release --bin SpanvisionCAD
```

Oluşturulan ikili dosya `target/release/SpanvisionCAD` konumuna yazılır (Windows'ta `SpanvisionCAD.exe`).

### Web

WebAssembly hedefini ve derleme araçlarını bir kez yükleyin:

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk wasm-bindgen-cli
```

Geliştirme sunucusunu başlatın:

```bash
trunk serve
```

## Otomasyon

Masaüstü ikili dosyası tek seferlik dönüştürmeyi ve kalıcı arayüzsüz sunucuyu destekler:

```bash
SpanvisionCAD --export input.dwg output.dxf
SpanvisionCAD --serve
SpanvisionCAD --serve --port 4242
SpanvisionCAD --mcp
```

Sunucu standart giriş/çıkış veya yerel TCP soketi üzerinden satır başına bir JSON nesnesi alışverişi yapar. [Otomasyon kılavuzuna](../automation/README.md) bakın.

## Eklentiler

Masaüstü eklentileri ayrı işlemlerde çalışır ve sürümlü eklenti API'si üzerinden ana uygulamayla iletişim kurar. Tarayıcı derlemesi yerel eklentileri yüklemez.

- [Eklenti mimarisi](../plugin-architecture.md)
- [Eklenti şablonu](../plugin-template/README.md)
- [Eklenti kayıt defteri](../../plugins/README.md)

## Proje belgeleri

- [Otomasyon API'si](../automation/README.md)
- [Eklenti mimarisi](../plugin-architecture.md)
- [Mozaikleme işlem hattı](../tessellation.md)
- [Güvenlik politikası](../../SECURITY.md)

## Lisans

CAD — Spanvision Infra, [GNU Genel Kamu Lisansı v3.0](../../LICENSE) kapsamında dağıtılır.

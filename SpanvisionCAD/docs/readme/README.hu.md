> Spanvision Infra distribution links are not configured yet. Use the supplied source directory and the current build instructions in [the main README](../../README.md).

<p align="center">
  <a href="../../README.md">English</a> · <a href="README.bg.md">Български</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.cs.md">Čeština</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.fr.md">Français</a> · <a href="README.fi.md">Suomi</a> · <a href="README.de.md">Deutsch</a> · <a href="README.el.md">Ελληνικά</a> · <a href="README.hu.md">Magyar</a> · <a href="README.it.md">Italiano</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.pl.md">Polski</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.es.md">Español</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a>
</p>

<p align="center"><img src="../../assets/logo.svg" width="112" alt="CAD — Spanvision Infra logó"></p>
<h1 align="center">CAD — Spanvision Infra</h1>
<p align="center">Nyílt forráskódú 2D rajzolás és 3D modellezés asztali gépre és webre, Rust nyelven.</p>




## Áttekintés

Az CAD — Spanvision Infra többplatformos alkalmazás műszaki rajzoláshoz, elrendezések készítéséhez és testmodellezéshez. Natívan olvas és ír DWG- és DXF-rajzokat; az asztali és böngészős változat közös szerkesztőmagot használ.


## Főbb jellemzők

- **Natív rajzi munkafolyamat** — DWG- és DXF-fájlok megnyitása, szerkesztése, helyreállítása és mentése átalakító szolgáltatás nélkül.
- **Pontos 2D rajzolás** — vonalak, vonalláncok, görbék, spline-ok, sraffozások, tárgyraszterek, követés, rétegek, blokkok és külső referenciák.
- **Dokumentációs eszközök** — szöveg, méretezés, mutatóvonalak, tűrések, táblázatok, modelltér, papírtér, nézetablakok és nyomtatási stílusok.
- **Kernelalapú 3D modellezés** — testprimitívek, kihúzás, forgatás, söprés, loft, logikai műveletek és ACIS-entitások tesszellációja.
- **GPU-megjelenítés** — `wgpu` által gyorsított 2D és 3D nézetek, ortografikus és perspektivikus kamerákkal.
- **Bővíthető munkafolyamatok** — natív bővítmények, parancsfájlok, felület nélküli konverzió és soralapú JSON automatizálási API.


## Fájlmunkafolyamatok

| Formátum vagy munkafolyamat | Támogatás |
| --- | --- |
| DWG | Olvasás és írás; verziózott mentési célok R14-től 2018-ig |
| DXF | Olvasás és írás; verziózott mentési célok R14-től 2018-ig |
| BAK / SV$ | Rajzi biztonsági másolatok és automatikus mentések megnyitása |
| OBJ | Poligonhálók importálása |
| LandXML | `CgPoint` felmérési pontok importálása |
| STL | 3D hálóadatok exportálása |
| STEP AP203 | 3D hálóadatok exportálása |
| PDF | Elrendezések és kijelölt geometria nyomtatása asztali gépen |
| CSV | Entitástulajdonságok adatainak kinyerése |
| CTB / STB | Nyomtatásistílus-táblák betöltése és szerkesztése |

## Asztali vagy webes változat

Használd a webalkalmazást azonnali, telepítés nélküli hozzáféréshez. A rajzok a böngészőben választhatók ki és helyi letöltésként menthetők.

Az asztali alkalmazást válaszd natív fájltársításokhoz, fájlkezelői bélyegképekhez, rendszernyomtatáshoz, PDF-kimenethez, külső bővítményekhez, parancsfájlokhoz és felület nélküli automatizáláshoz. Windows, Linux és Apple Silicon macOS rendszerhez érhetők el kiadások.

## Telepítés

Minden aktuális csomag a legújabb kiadásból tölthető le.

### Windows

Válassz az aláírt x86-64 csomagok közül:

- `SpanvisionCAD-*-windows-x86_64-installer.msi` — ajánlott telepítő Start menü-parancsikonokkal, DWG/DXF-fájltársításokkal és rajzi bélyegképekkel.
- `SpanvisionCAD-*-windows-x86_64-portable.exe` — önálló alkalmazás, telepítés nélkül.

### Linux

Töltsd le az x86-64 AppImage fájlt, tedd futtathatóvá, majd indítsd el:

```bash
chmod +x SpanvisionCAD-*-linux-x86_64.AppImage
./SpanvisionCAD-*-linux-x86_64.AppImage
```

### macOS

A kiadott macOS-csomag az Apple Silicon rendszereket támogatja:

1. Töltsd le az `SpanvisionCAD-*-macos-arm64.dmg` fájlt.
2. Nyisd meg a lemezképet, és húzd az `SpanvisionCAD.app` alkalmazást az **Applications** mappába.
3. Ha a Gatekeeper blokkolja az első indítást, engedélyezd az alkalmazást a **System Settings → Privacy & Security** alatt.

Az alkalmazás ad hoc aláírással rendelkezik, de az Apple jelenleg nem hitelesítette közjegyzői eljárással.

## Nyelvek

Az CAD — Spanvision Infra követheti a rendszer nyelvét, vagy használhatja az alábbi 21 felületi nyelv egyikét:

> Arab · Brazil portugál · Bolgár · Cseh · Holland · Angol · Finn · Francia · Német · Görög · Hindi · Magyar · Olasz · Japán · Koreai · Lengyel · Orosz · Egyszerűsített kínai · Spanyol · Hagyományos kínai · Török

A nyelv az alkalmazás beállításaiban módosítható. **Rendszer** választásakor a böngészős változat is a böngésző előnyben részesített területi beállítását használja.

## Fordítás forráskódból

### Asztali alkalmazás

Követelmények:

- Git
- Aktuális stabil Rust-eszközlánc
- A platform grafikai és betűkészlet-fejlesztő könyvtárai

Ubuntu vagy Debian alatt telepítsd a natív függőségeket:

```bash
sudo apt update
sudo apt install libgl1-mesa-dev libx11-dev libxcursor-dev libxi-dev \
  libxrandr-dev libxkbcommon-dev libwayland-dev libfontconfig1-dev \
  libfreetype6-dev
```

Ezután fordítsd le:

```bash
cd SpanvisionCAD
cargo build --release --bin SpanvisionCAD
```

A létrejövő bináris a `target/release/SpanvisionCAD` helyre kerül (Windows alatt `SpanvisionCAD.exe`).

### Web

Telepítsd egyszer a WebAssembly célt és a fordítóeszközöket:

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk wasm-bindgen-cli
```

Indítsd el a fejlesztői kiszolgálót:

```bash
trunk serve
```

## Automatizálás

Az asztali bináris egyszeri konverziót és tartós, felület nélküli kiszolgálót támogat:

```bash
SpanvisionCAD --export input.dwg output.dxf
SpanvisionCAD --serve
SpanvisionCAD --serve --port 4242
SpanvisionCAD --mcp
```

A kiszolgáló soronként egy JSON-objektumot cserél a szabványos bemeneten/kimeneten vagy helyi TCP-foglalaton. Lásd az [automatizálási útmutatót](../automation/README.md).

## Bővítmények

Az asztali bővítmények külön folyamatokban futnak, és a verziózott bővítmény-API-n keresztül kommunikálnak a gazdával. A böngészős változat nem tölt be natív bővítményeket.

- [Bővítményarchitektúra](../plugin-architecture.md)
- [Bővítménysablon](../plugin-template/README.md)
- [Bővítményjegyzék](../../plugins/README.md)

## Projektdokumentáció

- [Automatizálási API](../automation/README.md)
- [Bővítményarchitektúra](../plugin-architecture.md)
- [Tesszellációs folyamat](../tessellation.md)
- [Biztonsági szabályzat](../../SECURITY.md)

## Licenc

Az CAD — Spanvision Infra a [GNU General Public License v3.0](../../LICENSE) alatt kerül terjesztésre.

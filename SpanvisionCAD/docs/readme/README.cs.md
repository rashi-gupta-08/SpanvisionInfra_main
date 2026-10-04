> Spanvision Infra distribution links are not configured yet. Use the supplied source directory and the current build instructions in [the main README](../../README.md).

<p align="center">
  <a href="../../README.md">English</a> · <a href="README.bg.md">Български</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.cs.md">Čeština</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.fr.md">Français</a> · <a href="README.fi.md">Suomi</a> · <a href="README.de.md">Deutsch</a> · <a href="README.el.md">Ελληνικά</a> · <a href="README.hu.md">Magyar</a> · <a href="README.it.md">Italiano</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.pl.md">Polski</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.es.md">Español</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a>
</p>

<p align="center"><img src="../../assets/logo.svg" width="112" alt="Logo CAD — Spanvision Infra"></p>
<h1 align="center">CAD — Spanvision Infra</h1>
<p align="center">Open-source 2D kreslení a 3D modelování pro počítač i web, vytvořené v Rustu.</p>




## Přehled

CAD — Spanvision Infra je multiplatformní aplikace pro technické kreslení, práci s rozvržením a modelování těles. Nativně čte a zapisuje výkresy DWG a DXF; desktopová a prohlížečová verze používají společné editační jádro.


## Hlavní funkce

- **Nativní práce s výkresy** — otevírání, úpravy, obnova a ukládání DWG a DXF bez konverzní služby.
- **Přesné 2D kreslení** — úsečky, křivky, spline, šrafy, uchopení objektů, trasování, hladiny, bloky a externí reference.
- **Dokumentační nástroje** — text, kóty, odkazové čáry, tolerance, tabulky, modelový prostor, výkresový prostor, výřezy a styly vykreslování.
- **3D modelování s geometrickým jádrem** — základní tělesa, vysunutí, rotace, tažení, loft, booleovské operace a teselace entit ACIS.
- **Vykreslování přes GPU** — akcelerované 2D a 3D pohledy pomocí `wgpu`, s ortografickou a perspektivní kamerou.
- **Rozšiřitelné postupy** — nativní pluginy, příkazové skripty, bezobslužná konverze a řádkové JSON automatizační API.


## Práce se soubory

| Formát nebo postup | Podpora |
| --- | --- |
| DWG | Čtení a zápis; cílové verze ukládání R14 až 2018 |
| DXF | Čtení a zápis; cílové verze ukládání R14 až 2018 |
| BAK / SV$ | Otevírání záloh a automaticky uložených výkresů |
| OBJ | Import polygonových sítí |
| LandXML | Import zaměřených bodů `CgPoint` |
| STL | Export dat 3D sítí |
| STEP AP203 | Export dat 3D sítí |
| PDF | Vykreslení rozvržení a vybrané geometrie na počítači |
| CSV | Extrakce vlastností entit |
| CTB / STB | Načtení a úpravy tabulek stylů vykreslování |

## Počítač nebo web

Pro okamžitý přístup bez instalace použijte webovou aplikaci. Výkresy se vybírají v prohlížeči a ukládají jako místní soubory ke stažení.

Desktopovou aplikaci použijte pro nativní asociace souborů, náhledy ve správci souborů, systémový tisk, výstup PDF, externí pluginy, příkazové skripty a bezobslužnou automatizaci. Vydání jsou dostupná pro Windows, Linux a macOS s Apple Silicon.

## Instalace

Všechny aktuální balíčky stáhnete z nejnovějšího vydání.

### Windows

Vyberte jeden z podepsaných balíčků x86-64:

- `SpanvisionCAD-*-windows-x86_64-installer.msi` — doporučený instalátor se zástupci v nabídce Start, asociacemi DWG/DXF a náhledy výkresů.
- `SpanvisionCAD-*-windows-x86_64-portable.exe` — samostatná aplikace bez instalace.

### Linux

Stáhněte x86-64 AppImage, nastavte jej jako spustitelný a spusťte:

```bash
chmod +x SpanvisionCAD-*-linux-x86_64.AppImage
./SpanvisionCAD-*-linux-x86_64.AppImage
```

### macOS

Publikovaný balíček pro macOS podporuje Apple Silicon:

1. Stáhněte `SpanvisionCAD-*-macos-arm64.dmg`.
2. Otevřete obraz a přetáhněte `SpanvisionCAD.app` do **Applications**.
3. Pokud Gatekeeper první spuštění zablokuje, povolte aplikaci v **System Settings → Privacy & Security**.

Aplikace je podepsána ad hoc, ale v současnosti není notářsky ověřena společností Apple.

## Jazyky

CAD — Spanvision Infra může používat jazyk systému nebo jeden z těchto 21 jazyků rozhraní:

> Arabština · Brazilská portugalština · Bulharština · Čeština · Nizozemština · Angličtina · Finština · Francouzština · Němčina · Řečtina · Hindština · Maďarština · Italština · Japonština · Korejština · Polština · Ruština · Zjednodušená čínština · Španělština · Tradiční čínština · Turečtina

Jazyk změníte v nastavení aplikace. Pokud je vybrána možnost **Systém**, webová verze používá také preferované národní prostředí prohlížeče.

## Sestavení ze zdrojového kódu

### Desktop

Požadavky:

- Git
- Aktuální stabilní nástroje Rust
- Vývojové knihovny grafiky a písem dané platformy

Na Ubuntu nebo Debianu nainstalujte nativní závislosti:

```bash
sudo apt update
sudo apt install libgl1-mesa-dev libx11-dev libxcursor-dev libxi-dev \
  libxrandr-dev libxkbcommon-dev libwayland-dev libfontconfig1-dev \
  libfreetype6-dev
```

Poté sestavte:

```bash
cd SpanvisionCAD
cargo build --release --bin SpanvisionCAD
```

Výsledný program bude v `target/release/SpanvisionCAD` (ve Windows `SpanvisionCAD.exe`).

### Web

Jednorázově nainstalujte cíl WebAssembly a nástroje pro sestavení:

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk wasm-bindgen-cli
```

Spusťte vývojový server:

```bash
trunk serve
```

## Automatizace

Desktopový program podporuje jednorázovou konverzi a trvalý bezobslužný server:

```bash
SpanvisionCAD --export input.dwg output.dxf
SpanvisionCAD --serve
SpanvisionCAD --serve --port 4242
SpanvisionCAD --mcp
```

Server předává jeden objekt JSON na řádek přes standardní vstup/výstup nebo místní TCP socket. Viz [průvodce automatizací](../automation/README.md).

## Pluginy

Desktopové pluginy běží v oddělených procesech a komunikují s hostitelem přes verzované API pluginů. Prohlížečová verze nativní pluginy nenačítá.

- [Architektura pluginů](../plugin-architecture.md)
- [Šablona pluginu](../plugin-template/README.md)
- [Registr pluginů](../../plugins/README.md)

## Dokumentace projektu

- [Automatizační API](../automation/README.md)
- [Architektura pluginů](../plugin-architecture.md)
- [Proces teselace](../tessellation.md)
- [Bezpečnostní zásady](../../SECURITY.md)

## Licence

CAD — Spanvision Infra je šířeno pod [GNU General Public License v3.0](../../LICENSE).

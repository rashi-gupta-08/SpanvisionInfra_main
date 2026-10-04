> Spanvision Infra distribution links are not configured yet. Use the supplied source directory and the current build instructions in [the main README](../../README.md).

<p align="center">
  <a href="../../README.md">English</a> · <a href="README.bg.md">Български</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.cs.md">Čeština</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.fr.md">Français</a> · <a href="README.fi.md">Suomi</a> · <a href="README.de.md">Deutsch</a> · <a href="README.el.md">Ελληνικά</a> · <a href="README.hu.md">Magyar</a> · <a href="README.it.md">Italiano</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.pl.md">Polski</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.es.md">Español</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a>
</p>

<p align="center"><img src="../../assets/logo.svg" width="112" alt="Logotipo de CAD — Spanvision Infra"></p>
<h1 align="center">CAD — Spanvision Infra</h1>
<p align="center">Dibujo 2D y modelado 3D de código abierto para escritorio y web, desarrollado con Rust.</p>




## Descripción general

CAD — Spanvision Infra es una aplicación multiplataforma para dibujo técnico, trabajo con presentaciones y modelado de sólidos. Lee y escribe dibujos DWG y DXF de forma nativa, con un núcleo de edición compartido entre las versiones de escritorio y navegador.


## Características destacadas

- **Flujo de dibujo nativo** — abre, edita, recupera y guarda archivos DWG y DXF sin un servicio de conversión.
- **Dibujo 2D preciso** — líneas, polilíneas, curvas, splines, sombreados, referencias a objetos, rastreo, capas, bloques y referencias externas.
- **Herramientas de documentación** — texto, cotas, directrices, tolerancias, tablas, espacio modelo, espacio papel, ventanas gráficas y estilos de trazado.
- **Modelado 3D respaldado por kernel** — primitivas sólidas, extrusión, revolución, barrido, loft, operaciones booleanas y teselación de entidades ACIS.
- **Renderizado por GPU** — vistas 2D y 3D aceleradas mediante `wgpu`, con cámaras ortográfica y en perspectiva.
- **Flujos ampliables** — complementos nativos, scripts de comandos, conversión sin interfaz y una API de automatización JSON basada en líneas.


## Flujos de archivos

| Formato o flujo | Compatibilidad |
| --- | --- |
| DWG | Lectura y escritura; destinos de guardado versionados de R14 a 2018 |
| DXF | Lectura y escritura; destinos de guardado versionados de R14 a 2018 |
| BAK / SV$ | Apertura de copias de seguridad y archivos de guardado automático |
| OBJ | Importación de mallas poligonales |
| LandXML | Importación de puntos topográficos `CgPoint` |
| STL | Exportación de datos de malla 3D |
| STEP AP203 | Exportación de datos de malla 3D |
| PDF | Trazado de presentaciones y geometría seleccionada en escritorio |
| CSV | Extracción de datos de propiedades de entidades |
| CTB / STB | Carga y edición de tablas de estilos de trazado |

## Escritorio o web

Usa la aplicación web para acceder de inmediato sin instalar nada. Los dibujos se seleccionan mediante el navegador y se guardan como descargas locales.

Usa la aplicación de escritorio para asociaciones de archivos nativas, miniaturas del gestor de archivos, impresión del sistema, salida PDF, complementos externos, scripts de comandos y automatización sin interfaz. Hay versiones para Windows, Linux y macOS con Apple Silicon.

## Instalación

Descarga todos los paquetes actuales desde la última versión.

### Windows

Elige uno de estos paquetes x86-64 firmados:

- `SpanvisionCAD-*-windows-x86_64-installer.msi` — instalador recomendado con accesos directos del menú Inicio, asociaciones DWG/DXF y miniaturas de dibujos.
- `SpanvisionCAD-*-windows-x86_64-portable.exe` — aplicación independiente; no requiere instalación.

### Linux

Descarga la AppImage x86-64, hazla ejecutable e iníciala:

```bash
chmod +x SpanvisionCAD-*-linux-x86_64.AppImage
./SpanvisionCAD-*-linux-x86_64.AppImage
```

### macOS

El paquete publicado para macOS es compatible con Apple Silicon:

1. Descarga `SpanvisionCAD-*-macos-arm64.dmg`.
2. Abre la imagen y arrastra `SpanvisionCAD.app` a **Applications**.
3. Si Gatekeeper bloquea el primer inicio, autoriza la aplicación en **System Settings → Privacy & Security**.

La aplicación tiene firma ad hoc, pero actualmente no está notarizada por Apple.

## Idiomas

CAD — Spanvision Infra puede seguir el idioma del sistema o usar cualquiera de estos 21 idiomas de interfaz:

> Árabe · Portugués de Brasil · Búlgaro · Checo · Neerlandés · Inglés · Finés · Francés · Alemán · Griego · Hindi · Húngaro · Italiano · Japonés · Coreano · Polaco · Ruso · Chino simplificado · Español · Chino tradicional · Turco

Cambia el idioma en los ajustes de la aplicación. La versión web también usa la configuración regional preferida del navegador cuando se selecciona **Sistema**.

## Compilar desde el código fuente

### Escritorio

Requisitos:

- Git
- Cadena de herramientas estable actual de Rust
- Bibliotecas de desarrollo de gráficos y fuentes de la plataforma

En Ubuntu o Debian, instala las dependencias nativas:

```bash
sudo apt update
sudo apt install libgl1-mesa-dev libx11-dev libxcursor-dev libxi-dev \
  libxrandr-dev libxkbcommon-dev libwayland-dev libfontconfig1-dev \
  libfreetype6-dev
```

Después compila:

```bash
cd SpanvisionCAD
cargo build --release --bin SpanvisionCAD
```

El binario resultante se escribe en `target/release/SpanvisionCAD` (`SpanvisionCAD.exe` en Windows).

### Web

Instala una vez el destino WebAssembly y las herramientas de compilación:

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk wasm-bindgen-cli
```

Inicia el servidor de desarrollo:

```bash
trunk serve
```

## Automatización

El binario de escritorio admite conversión puntual y un servidor persistente sin interfaz:

```bash
SpanvisionCAD --export input.dwg output.dxf
SpanvisionCAD --serve
SpanvisionCAD --serve --port 4242
SpanvisionCAD --mcp
```

El servidor intercambia un objeto JSON por línea mediante entrada/salida estándar o un socket TCP local. Consulta la [guía de automatización](../automation/README.md).

## Complementos

Los complementos de escritorio se ejecutan en procesos separados y se comunican con el anfitrión mediante la API de complementos versionada. La versión del navegador no carga complementos nativos.

- [Arquitectura de complementos](../plugin-architecture.md)
- [Plantilla de complemento](../plugin-template/README.md)
- [Registro de complementos](../../plugins/README.md)

## Documentación del proyecto

- [API de automatización](../automation/README.md)
- [Arquitectura de complementos](../plugin-architecture.md)
- [Canal de teselación](../tessellation.md)
- [Política de seguridad](../../SECURITY.md)

## Licencia

CAD — Spanvision Infra se distribuye bajo la [Licencia Pública General de GNU v3.0](../../LICENSE).

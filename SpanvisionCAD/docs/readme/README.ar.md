> Spanvision Infra distribution links are not configured yet. Use the supplied source directory and the current build instructions in [the main README](../../README.md).

<p align="center">
  <a href="../../README.md">English</a> · <a href="README.bg.md">Български</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.cs.md">Čeština</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.fr.md">Français</a> · <a href="README.fi.md">Suomi</a> · <a href="README.de.md">Deutsch</a> · <a href="README.el.md">Ελληνικά</a> · <a href="README.hu.md">Magyar</a> · <a href="README.it.md">Italiano</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.pl.md">Polski</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.es.md">Español</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a>
</p>

<p align="center"><img src="../../assets/logo.svg" width="112" alt="شعار CAD — Spanvision Infra"></p>
<h1 align="center">CAD — Spanvision Infra</h1>
<p align="center" dir="rtl">تطبيق مفتوح المصدر للرسم ثنائي الأبعاد والنمذجة ثلاثية الأبعاد على سطح المكتب والويب، مبني بلغة Rust.</p>


<p align="center" dir="rtl">
  
  
  </p>


## نظرة عامة

CAD — Spanvision Infra تطبيق متعدد المنصات للرسم التقني والعمل على التخطيطات ونمذجة المجسمات. يقرأ رسومات DWG وDXF ويكتبها مباشرة، ويشترك إصدار سطح المكتب وإصدار المتصفح في نواة التحرير نفسها.


## أبرز الميزات

- **سير عمل أصلي للرسومات** — فتح ملفات DWG وDXF وتحريرها واستعادتها وحفظها من دون خدمة تحويل.
- **رسم ثنائي الأبعاد دقيق** — خطوط وخطوط متعددة ومنحنيات ومنحنيات spline وتهشير والتقاط الكائنات والتتبع والطبقات والكتل والمراجع الخارجية.
- **أدوات التوثيق** — نصوص وأبعاد وخطوط إشارة وتفاوتات وجداول ومساحة النموذج ومساحة الورق وإطارات العرض وأنماط الطباعة.
- **نمذجة ثلاثية الأبعاد مدعومة بنواة هندسية** — مجسمات أولية وبثق ودوران ومسح وloft وعمليات منطقية وتجزئة كيانات ACIS.
- **تصيير عبر GPU** — إطارات عرض ثنائية وثلاثية الأبعاد مسرّعة بواسطة `wgpu` مع كاميرات متعامدة ومنظورية.
- **سير عمل قابل للتوسعة** — إضافات أصلية ونصوص أوامر وتحويل من دون واجهة وواجهة JSON للأتمتة تعتمد على الأسطر.


## سير عمل الملفات

| التنسيق أو سير العمل | الدعم |
| --- | --- |
| DWG | قراءة وكتابة؛ اختيار إصدارات الحفظ من R14 إلى 2018 |
| DXF | قراءة وكتابة؛ اختيار إصدارات الحفظ من R14 إلى 2018 |
| BAK / SV$ | فتح النسخ الاحتياطية وملفات الحفظ التلقائي للرسومات |
| OBJ | استيراد الشبكات متعددة الأضلاع |
| LandXML | استيراد نقاط المسح `CgPoint` |
| STL | تصدير بيانات الشبكات ثلاثية الأبعاد |
| STEP AP203 | تصدير بيانات الشبكات ثلاثية الأبعاد |
| PDF | طباعة التخطيطات والعناصر الهندسية المحددة في إصدار سطح المكتب |
| CSV | استخراج بيانات خصائص الكيانات |
| CTB / STB | تحميل جداول أنماط الطباعة وتحريرها |

## سطح المكتب أم الويب

استخدم تطبيق الويب للوصول الفوري من دون تثبيت. تُختار الرسومات من خلال المتصفح وتُحفظ كتنزيلات محلية.

استخدم تطبيق سطح المكتب لارتباطات الملفات الأصلية والصور المصغرة في مدير الملفات وطباعة النظام وإخراج PDF والإضافات الخارجية ونصوص الأوامر والأتمتة من دون واجهة. تتوفر إصدارات لنظام Windows وLinux وmacOS بمعالجات Apple Silicon.

## التثبيت

نزّل جميع الحزم الحالية من أحدث إصدار.

### Windows

اختر إحدى حزم x86-64 الموقّعة:

- `SpanvisionCAD-*-windows-x86_64-installer.msi` — برنامج التثبيت الموصى به، ويتضمن اختصارات قائمة ابدأ وارتباطات ملفات DWG/DXF وصوراً مصغرة للرسومات.
- `SpanvisionCAD-*-windows-x86_64-portable.exe` — تطبيق مستقل لا يحتاج إلى تثبيت.

### Linux

نزّل AppImage لمعمارية x86-64 واجعله قابلاً للتنفيذ ثم شغّله:

```bash
chmod +x SpanvisionCAD-*-linux-x86_64.AppImage
./SpanvisionCAD-*-linux-x86_64.AppImage
```

### macOS

تدعم حزمة macOS المنشورة أجهزة Apple Silicon:

1. نزّل `SpanvisionCAD-*-macos-arm64.dmg`.
2. افتح الصورة واسحب `SpanvisionCAD.app` إلى **Applications**.
3. إذا منع Gatekeeper التشغيل الأول، فاسمح بالتطبيق من **System Settings → Privacy & Security**.

التطبيق موقّع بتوقيع ad hoc، لكنه غير موثّق حالياً لدى Apple.

## اللغات

يمكن لـ CAD — Spanvision Infra اتباع لغة النظام أو استخدام إحدى لغات الواجهة التالية البالغ عددها 21 لغة:

> العربية · البرتغالية البرازيلية · البلغارية · التشيكية · الهولندية · الإنجليزية · الفنلندية · الفرنسية · الألمانية · اليونانية · الهندية · المجرية · الإيطالية · اليابانية · الكورية · البولندية · الروسية · الصينية المبسطة · الإسبانية · الصينية التقليدية · التركية

غيّر اللغة من إعدادات التطبيق. عند اختيار **النظام**، يستخدم إصدار المتصفح أيضاً الإعدادات المحلية المفضلة للمتصفح.

## البناء من المصدر

### سطح المكتب

المتطلبات:

- Git
- سلسلة أدوات Rust المستقرة الحالية
- مكتبات تطوير الرسوم والخطوط الخاصة بالمنصة

ثبّت الاعتماديات الأصلية على Ubuntu أو Debian:

```bash
sudo apt update
sudo apt install libgl1-mesa-dev libx11-dev libxcursor-dev libxi-dev \
  libxrandr-dev libxkbcommon-dev libwayland-dev libfontconfig1-dev \
  libfreetype6-dev
```

ثم ابنِ التطبيق:

```bash
cd SpanvisionCAD
cargo build --release --bin SpanvisionCAD
```

يُكتب الملف التنفيذي الناتج في `target/release/SpanvisionCAD` (`SpanvisionCAD.exe` على Windows).

### الويب

ثبّت هدف WebAssembly وأدوات البناء مرة واحدة:

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk wasm-bindgen-cli
```

شغّل خادم التطوير:

```bash
trunk serve
```

## الأتمتة

يدعم الملف التنفيذي لسطح المكتب التحويل لمرة واحدة وخادماً دائماً من دون واجهة:

```bash
SpanvisionCAD --export input.dwg output.dxf
SpanvisionCAD --serve
SpanvisionCAD --serve --port 4242
SpanvisionCAD --mcp
```

يتبادل الخادم كائن JSON واحداً في كل سطر عبر الإدخال/الإخراج القياسي أو مقبس TCP محلي. راجع [دليل الأتمتة](../automation/README.md).

## الإضافات

تعمل إضافات سطح المكتب في عمليات منفصلة وتتواصل مع المضيف عبر واجهة إضافات ذات إصدارات. لا يحمّل إصدار المتصفح الإضافات الأصلية.

- [بنية الإضافات](../plugin-architecture.md)
- [قالب الإضافة](../plugin-template/README.md)
- [سجل الإضافات](../../plugins/README.md)

## وثائق المشروع

- [واجهة الأتمتة](../automation/README.md)
- [بنية الإضافات](../plugin-architecture.md)
- [مسار التجزئة](../tessellation.md)
- [سياسة الأمان](../../SECURITY.md)

## الترخيص

يُوزّع CAD — Spanvision Infra بموجب [رخصة جنو العمومية الإصدار 3.0](../../LICENSE).

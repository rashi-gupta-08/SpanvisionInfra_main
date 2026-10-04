> Spanvision Infra distribution links are not configured yet. Use the supplied source directory and the current build instructions in [the main README](../../README.md).

<p align="center">
  <a href="../../README.md">English</a> · <a href="README.bg.md">Български</a> · <a href="README.pt-BR.md">Português (Brasil)</a> · <a href="README.cs.md">Čeština</a> · <a href="README.nl.md">Nederlands</a> · <a href="README.fr.md">Français</a> · <a href="README.fi.md">Suomi</a> · <a href="README.de.md">Deutsch</a> · <a href="README.el.md">Ελληνικά</a> · <a href="README.hu.md">Magyar</a> · <a href="README.it.md">Italiano</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.pl.md">Polski</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.es.md">Español</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a>
</p>

<p align="center"><img src="../../assets/logo.svg" width="112" alt="CAD — Spanvision Infra लोगो"></p>
<h1 align="center">CAD — Spanvision Infra</h1>
<p align="center">Rust से निर्मित, डेस्कटॉप और वेब के लिए मुक्त-स्रोत 2D ड्राफ्टिंग और 3D मॉडलिंग अनुप्रयोग।</p>




## परिचय

CAD — Spanvision Infra तकनीकी ड्राइंग, लेआउट कार्य और सॉलिड मॉडलिंग के लिए एक क्रॉस-प्लेटफ़ॉर्म अनुप्रयोग है। यह DWG और DXF ड्राइंग को मूल रूप से पढ़ता और लिखता है, तथा डेस्कटॉप और ब्राउज़र संस्करण समान संपादन कोर साझा करते हैं।


## प्रमुख विशेषताएँ

- **मूल ड्राइंग कार्यप्रवाह** — किसी रूपांतरण सेवा के बिना DWG और DXF फ़ाइलें खोलें, संपादित करें, पुनर्प्राप्त करें और सहेजें।
- **सटीक 2D ड्राफ्टिंग** — रेखाएँ, पॉलीलाइन, वक्र, स्प्लाइन, हैच, ऑब्जेक्ट स्नैप, ट्रैकिंग, लेयर, ब्लॉक और बाहरी संदर्भ।
- **दस्तावेज़ीकरण उपकरण** — टेक्स्ट, आयाम, लीडर, टॉलरेंस, टेबल, मॉडल स्पेस, पेपर स्पेस, व्यूपोर्ट और प्लॉट शैली।
- **ज्यामिति कर्नेल आधारित 3D मॉडलिंग** — सॉलिड प्रिमिटिव, एक्सट्रूज़न, रिवॉल्व, स्वीप, लॉफ्ट, बूलियन ऑपरेशन और ACIS एंटिटी टेसेलेशन।
- **GPU रेंडरिंग** — `wgpu` से तेज़ किए गए 2D और 3D व्यूपोर्ट, ऑर्थोग्राफ़िक और पर्सपेक्टिव कैमरा सहित।
- **विस्तार योग्य कार्यप्रवाह** — मूल प्लगइन, कमांड स्क्रिप्ट, हेडलेस रूपांतरण और पंक्ति-आधारित JSON स्वचालन API।


## फ़ाइल कार्यप्रवाह

| प्रारूप या कार्यप्रवाह | समर्थन |
| --- | --- |
| DWG | पढ़ना और लिखना; R14 से 2018 तक संस्करण चुनकर सहेजना |
| DXF | पढ़ना और लिखना; R14 से 2018 तक संस्करण चुनकर सहेजना |
| BAK / SV$ | ड्राइंग बैकअप और स्वतः-सहेजी गई फ़ाइलें खोलना |
| OBJ | पॉलीगॉन मेश आयात करना |
| LandXML | `CgPoint` सर्वेक्षण बिंदु आयात करना |
| STL | 3D मेश डेटा निर्यात करना |
| STEP AP203 | 3D मेश डेटा निर्यात करना |
| PDF | डेस्कटॉप पर लेआउट और चुनी हुई ज्यामिति प्लॉट करना |
| CSV | एंटिटी गुणों का डेटा निकालना |
| CTB / STB | प्लॉट शैली टेबल लोड और संपादित करना |

## डेस्कटॉप या वेब

बिना स्थापना तुरंत शुरू करने के लिए वेब ऐप का उपयोग करें। ड्राइंग ब्राउज़र से चुनी जाती हैं और स्थानीय डाउनलोड के रूप में सहेजी जाती हैं।

मूल फ़ाइल संबद्धता, फ़ाइल मैनेजर थंबनेल, सिस्टम प्रिंटिंग, PDF आउटपुट, बाहरी प्लगइन, कमांड स्क्रिप्ट और हेडलेस स्वचालन के लिए डेस्कटॉप अनुप्रयोग उपयोग करें। Windows, Linux और Apple Silicon macOS के लिए रिलीज़ उपलब्ध हैं।

## स्थापना

सभी मौजूदा पैकेज नवीनतम रिलीज़ से डाउनलोड करें।

### Windows

इन हस्ताक्षरित x86-64 पैकेजों में से एक चुनें:

- `SpanvisionCAD-*-windows-x86_64-installer.msi` — Start Menu शॉर्टकट, DWG/DXF फ़ाइल संबद्धता और ड्राइंग थंबनेल वाला अनुशंसित इंस्टॉलर।
- `SpanvisionCAD-*-windows-x86_64-portable.exe` — स्वतंत्र अनुप्रयोग; स्थापना आवश्यक नहीं।

### Linux

x86-64 AppImage डाउनलोड करें, उसे निष्पादन योग्य बनाएँ और चलाएँ:

```bash
chmod +x SpanvisionCAD-*-linux-x86_64.AppImage
./SpanvisionCAD-*-linux-x86_64.AppImage
```

### macOS

प्रकाशित macOS पैकेज Apple Silicon का समर्थन करता है:

1. `SpanvisionCAD-*-macos-arm64.dmg` डाउनलोड करें।
2. इमेज खोलें और `SpanvisionCAD.app` को **Applications** में खींचें।
3. यदि Gatekeeper पहली बार चलाने से रोके, तो **System Settings → Privacy & Security** में ऐप को अनुमति दें।

अनुप्रयोग पर ad hoc हस्ताक्षर हैं, लेकिन वर्तमान में Apple ने इसे नोटराइज़ नहीं किया है।

## भाषाएँ

CAD — Spanvision Infra सिस्टम भाषा का अनुसरण कर सकता है या इन 21 इंटरफ़ेस भाषाओं में से किसी एक का उपयोग कर सकता है:

> अरबी · ब्राज़ीलियाई पुर्तगाली · बुल्गारियाई · चेक · डच · अंग्रेज़ी · फ़िनिश · फ़्रेंच · जर्मन · यूनानी · हिन्दी · हंगेरियन · इतालवी · जापानी · कोरियाई · पोलिश · रूसी · सरलीकृत चीनी · स्पैनिश · पारंपरिक चीनी · तुर्की

अनुप्रयोग सेटिंग में भाषा बदलें। **सिस्टम** चुने जाने पर ब्राउज़र संस्करण भी ब्राउज़र की पसंदीदा लोकेल का उपयोग करता है।

## स्रोत से निर्माण

### डेस्कटॉप

आवश्यकताएँ:

- Git
- वर्तमान स्थिर Rust टूलचेन
- प्लेटफ़ॉर्म की ग्राफ़िक्स और फ़ॉन्ट विकास लाइब्रेरी

Ubuntu या Debian पर मूल निर्भरताएँ स्थापित करें:

```bash
sudo apt update
sudo apt install libgl1-mesa-dev libx11-dev libxcursor-dev libxi-dev \
  libxrandr-dev libxkbcommon-dev libwayland-dev libfontconfig1-dev \
  libfreetype6-dev
```

फिर निर्माण करें:

```bash
cd SpanvisionCAD
cargo build --release --bin SpanvisionCAD
```

तैयार बाइनरी `target/release/SpanvisionCAD` में लिखी जाती है (Windows पर `SpanvisionCAD.exe`)।

### वेब

WebAssembly लक्ष्य और निर्माण उपकरण एक बार स्थापित करें:

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk wasm-bindgen-cli
```

डेवलपमेंट सर्वर शुरू करें:

```bash
trunk serve
```

## स्वचालन

डेस्कटॉप बाइनरी एक बार के रूपांतरण और लगातार चलने वाले हेडलेस सर्वर का समर्थन करती है:

```bash
SpanvisionCAD --export input.dwg output.dxf
SpanvisionCAD --serve
SpanvisionCAD --serve --port 4242
SpanvisionCAD --mcp
```

सर्वर मानक इनपुट/आउटपुट या स्थानीय TCP सॉकेट के माध्यम से प्रति पंक्ति एक JSON ऑब्जेक्ट का आदान-प्रदान करता है। [स्वचालन मार्गदर्शिका](../automation/README.md) देखें।

## प्लगइन

डेस्कटॉप प्लगइन अलग प्रक्रियाओं में चलते हैं और संस्करणित प्लगइन API के माध्यम से होस्ट से संवाद करते हैं। ब्राउज़र बिल्ड मूल प्लगइन लोड नहीं करता।

- [प्लगइन संरचना](../plugin-architecture.md)
- [प्लगइन टेम्पलेट](../plugin-template/README.md)
- [प्लगइन रजिस्ट्री](../../plugins/README.md)

## परियोजना दस्तावेज़

- [स्वचालन API](../automation/README.md)
- [प्लगइन संरचना](../plugin-architecture.md)
- [टेसेलेशन पाइपलाइन](../tessellation.md)
- [सुरक्षा नीति](../../SECURITY.md)

## लाइसेंस

CAD — Spanvision Infra को [GNU General Public License v3.0](../../LICENSE) के अंतर्गत वितरित किया जाता है।

#!/usr/bin/env python3
"""Build the static website using the application's supported locales."""

import hashlib
import json
import re
import shutil
import sys
from html import escape
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
BRAND = json.loads((ROOT / "brand.json").read_text(encoding="utf-8"))
BASE = (BRAND.get("website_url") or "").rstrip("/")
REPO = BRAND.get("repository_url") or ""
RELEASE = BRAND.get("release_url") or ""
COMMUNITY = BRAND.get("community_url") or ""


def locale_path(locale):
    return f"/{locale}/"


def public_path(locale):
    return "/" if locale == "en-US" else locale_path(locale)


def load_catalogs():
    catalogs = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in sorted((ROOT / "site/locales").glob("*.json"))}
    supported = {p.parent.name for p in (ROOT / "locales").glob("*/opencadstudio.ftl")}
    if catalogs.keys() != supported:
        raise ValueError(f"Website locale mismatch: {catalogs.keys() ^ supported}")
    source = catalogs["en-US"]
    for locale, messages in catalogs.items():
        if messages.keys() != source.keys():
            raise ValueError(f"{locale}: translation key mismatch: {messages.keys() ^ source.keys()}")
        for key, value in messages.items():
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{locale}: empty translation for {key}")
            if set(re.findall(r"\{\w+\}", value)) != set(re.findall(r"\{\w+\}", source[key])):
                raise ValueError(f"{locale}: placeholder mismatch for {key}")
    return {"en-US": catalogs["en-US"]}


def build(output):
    catalogs = load_catalogs()
    template = (ROOT / "index.html").read_text(encoding="utf-8")
    (output / "assets").mkdir(parents=True, exist_ok=True)
    current_assets = set()

    def asset(source):
        fingerprint = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
        path = f"/assets/{source.stem}-{fingerprint}{source.suffix}"
        shutil.copyfile(source, output / path.lstrip("/"))
        current_assets.add(Path(path).name)
        return path

    logo = asset(ROOT / "assets/logo.svg")
    workspace = asset(ROOT / "site/preview-plan.svg")
    modeling = asset(ROOT / "site/preview-model.svg")
    shutil.copyfile(ROOT / "assets/logo.svg", output / "assets/logo.svg")
    shutil.copyfile(ROOT / "site/legal.html", output / "legal.html")
    for filename in ("favicon.ico", "favicon.svg", "favicon.png"):
        shutil.copyfile(ROOT / "site" / filename, output / filename)
    icons = ('<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48 96x96 256x256" />\n'
             '<link rel="icon" href="/favicon.png" type="image/png" sizes="96x96" />\n'
             '<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />\n'
             '<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />')
    manifest = json.loads((ROOT / "site/site.webmanifest").read_text(encoding="utf-8"))
    manifest["name"] = BRAND["display_name"]
    manifest["short_name"] = BRAND["product"]
    manifest["background_color"] = "#000000"
    manifest["theme_color"] = "#000000"
    manifest["icons"] = [{"src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml"}]
    for size in (192, 512):
        manifest["icons"].append({"src": asset(ROOT / f"site/icon-{size}.png"), "sizes": f"{size}x{size}", "type": "image/png"})
    shutil.copyfile(ROOT / "site/apple-touch-icon.png", output / "apple-touch-icon.png")
    css_version = hashlib.sha256((ROOT / "site/site.css").read_bytes()).hexdigest()[:12]
    script = "const SITE_LOCALES = " + json.dumps(list(catalogs)) + ";\n" + (ROOT / "site/site.js").read_text(encoding="utf-8")
    (output / "site.js").write_text(script, encoding="utf-8")
    js_version = hashlib.sha256(script.encode()).hexdigest()[:12]
    alternates = '\n'.join(f'<link rel="alternate" hreflang="{lang}" href="{BASE}{public_path(lang)}" />' for lang in catalogs) if BASE else ""
    if BASE:
        alternates += f'\n<link rel="alternate" hreflang="x-default" href="{BASE}/" />'
    for locale, messages in catalogs.items():
        path = public_path(locale)
        destination = output / locale_path(locale).lstrip("/")
        destination.mkdir(parents=True, exist_ok=True)
        language_links = '\n'.join(
            f'<a href="{public_path(lang)}" lang="{lang}" hreflang="{lang}" dir="auto"'
            + (' aria-current="page"' if lang == locale else '')
            + f'>{escape(labels["name"])}</a>' for lang, labels in catalogs.items()
        )
        schema = {
            "@context": "https://schema.org", "@type": "SoftwareApplication",
            "name": BRAND["display_name"], "url": BASE + path, "inLanguage": locale,
            "description": messages["description"], "applicationCategory": "DesignApplication",
            "operatingSystem": "Windows, Linux, macOS, Web", "isAccessibleForFree": True,
            "license": "https://www.gnu.org/licenses/gpl-3.0.html", "installUrl": BASE + "/app/",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        }
        if REPO:
            schema["codeRepository"] = REPO
        if RELEASE:
            schema["downloadUrl"] = RELEASE
        website_schema = {
            "@context": "https://schema.org", "@type": "WebSite",
            "name": BRAND["display_name"], "alternateName": [BRAND["product"], BRAND["organization"]],
            "url": BASE + "/",
        }
        repository_link = f'<a href="{escape(REPO)}">GitHub</a>' if REPO else ""
        download_button = f'<a class="button button-quiet" href="{escape(RELEASE)}">{escape(messages["download"])}</a>' if RELEASE else ""
        release_links = (f'<a class="text-link" href="{escape(RELEASE)}">{escape(messages["latest"])} <span aria-hidden="true">↗</span></a>' if RELEASE else "")
        footer_links = ""
        if RELEASE:
            footer_links += f'<a href="{escape(RELEASE)}">{escape(messages["download_nav"])}</a>'
        if COMMUNITY:
            footer_links += f'<a href="{escape(COMMUNITY)}">{escape(messages["discussions"])}</a>'
        growth_section = ""
        if REPO and RELEASE:
            growth_section = (f'<section class="section growth-section" id="growth"><div class="shell">'
                              f'<div class="section-heading"><p class="eyebrow"><span></span>{escape(messages["growth_label"])}</p>'
                              f'<h2>{escape(messages["growth_title"])}</h2><p>{escape(messages["growth_text"])}</p></div>'
                              f'<div class="growth-grid"><figure class="growth-card"><a href="{escape(REPO)}">{escape(messages["github"])} ↗</a></figure>'
                              f'<figure class="growth-card"><a href="{escape(RELEASE)}">{escape(messages["releases_link"])} ↗</a></figure></div></div></section>')
        community_section = ""
        if COMMUNITY:
            community_section = (f'<section class="section shell community-cta"><div><p class="eyebrow"><span></span>{escape(messages["community_label"])}</p>'
                                 f'<h2>{escape(messages["community_title"])}</h2><p>{escape(messages["community_text"])}</p></div>'
                                 f'<div class="cta-links"><a class="button" href="{escape(COMMUNITY)}">{escape(messages["discussions"])}</a></div></section>')
        schema_json = json.dumps(schema, ensure_ascii=False).replace("<", "\\u003c")
        values = {key: escape(value) for key, value in messages.items()}
        values.update(workspace_alt="", model_alt="",
                      locale=locale, direction="rtl" if locale == "ar-SA" else "ltr",
                      path=path, url=BASE + path if BASE else path, og_locale=locale.replace("-", "_"),
                      logo=logo, workspace=workspace, modeling=modeling, icons=icons,
                      css_version=css_version, js_version=js_version, alternates=alternates,
                      canonical_meta=f'<link rel="canonical" href="{BASE}{path}" />' if BASE else "",
                      social_url_meta=f'<meta property="og:url" content="{BASE}{path}" />' if BASE else "",
                      social_image_meta=f'<meta property="og:image" content="{BASE}{workspace}" />' if BASE else "",
                      twitter_image_meta=f'<meta name="twitter:image" content="{BASE}{workspace}" />' if BASE else "",
                      repository_link=repository_link, download_button=download_button,
                      release_links=release_links, growth_section=growth_section,
                      community_section=community_section, footer_links=footer_links,
                      languages=escape(messages["languages"].format(count=len(catalogs))),
                      language_links=language_links,
                      website_schema=(f'<script type="application/ld+json">{json.dumps(website_schema)}</script>'
                                      if locale == "en-US" and BASE else ""),
                      schema_meta=(f'<script type="application/ld+json">{schema_json}</script>' if BASE else ""))
        rendered = re.sub(r"\{\{(\w+)\}\}", lambda match: values[match[1]], template)
        (destination / "index.html").write_text(rendered, encoding="utf-8")
        localized_manifest = {**manifest, "lang": locale, "dir": values["direction"],
                              "description": messages["description"], "start_url": path,
                              "shortcuts": [{"name": messages["launch"], "url": "/app/"}]}
        (destination / "site.webmanifest").write_text(json.dumps(localized_manifest, ensure_ascii=False, indent=2) + '\n', encoding="utf-8")
    for filename in ("index.html", "site.webmanifest"):
        shutil.copyfile(output / "en-US" / filename, output / filename)
    # Remove only superseded files generated by this builder. Old brand marks
    # must not remain in a release when the site is rebuilt in the same folder.
    for previous in (output / "assets").iterdir():
        if (previous.is_file() and previous.name not in current_assets
                and re.fullmatch(r"(?:logo|workspace|modeling|preview-plan|preview-model|icon-192|icon-512)-[0-9a-f]{12}\.(?:svg|png)", previous.name)):
            previous.unlink()
    if BASE:
        urls = ''.join(f'<url><loc>{BASE}{public_path(locale)}</loc></url>\n' for locale in catalogs)
        (output / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n', encoding="utf-8")
        host = urlparse(BASE).hostname
        if host:
            (output / "CNAME").write_text(host + "\n", encoding="utf-8")
    robots = "User-agent: *\nAllow: /\n"
    if BASE:
        robots += f"\nSitemap: {BASE}/sitemap.xml\n"
    (output / "robots.txt").write_text(robots, encoding="utf-8")

    app = output / "app/index.html"
    if app.exists():
        html = re.sub(r'<link\b(?=[^>]*\brel=["\'](?:(?:shortcut )?icon|apple-touch-icon)["\'])[^>]*>', '', app.read_text(encoding="utf-8"))
        app.write_text(html.replace('</head>', icons + '\n</head>'), encoding="utf-8")
    print(f"Built {len(catalogs)} website languages and current application icons")


if __name__ == "__main__":
    build(Path(sys.argv[1] if len(sys.argv) > 1 else "dist"))

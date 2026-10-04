"""Run with python3 scripts/test_site.py (Python and Node standard libraries)."""

from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import os
import sys
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.ids = set()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, attrs['id']
            self.ids.add(attrs['id'])


with tempfile.TemporaryDirectory() as directory:
    output = Path(directory)
    (output / 'app').mkdir()
    (output / 'app/index.html').write_text('<html><head><link rel="icon" href="/old.svg" integrity="old" /></head><body>App</body></html>')
    subprocess.run(['sh', 'scripts/assemble-site.sh', str(output)], cwd=ROOT, check=True,
                   env={**os.environ, 'PYTHON': sys.executable})
    catalogs = {p.stem: json.loads(p.read_text()) for p in (ROOT / 'site/locales').glob('*.json')}
    supported = set(re.findall(r'#\[serde\(rename = "([a-z]{2}-[A-Z]{2})"\)\]', (ROOT / 'src/i18n.rs').read_text()))
    assert catalogs.keys() == supported
    for locale, messages in catalogs.items():
        html = (output / locale / 'index.html').read_text()
        assert '{{' not in html and '{count}' not in html, locale
        page = Page(html)
        assert ('html', {'lang': locale, 'dir': 'rtl' if locale == 'ar-SA' else 'ltr'}) in page.tags
        links = [attrs for tag, attrs in page.tags if tag == 'link']
        assert {link['href'] for link in links if link.get('rel') == 'icon'} == {'/favicon.ico', '/favicon.png', '/favicon.svg'}
        assert not any(link.get('rel') in {'canonical', 'alternate'} for link in links)
        expected_path = '/' if locale == 'en-US' else f'/{locale}/'
        choices = [attrs for tag, attrs in page.tags if tag == 'a' and 'hreflang' in attrs]
        assert {choice['hreflang'] for choice in choices} == supported
        assert [choice['hreflang'] for choice in choices if choice.get('aria-current') == 'page'] == [locale]
        assert not re.search(r'<script type="application/ld\+json">', html)
        assert 'Spanvision Infra' in html and 'OpenCADStudio' not in html
        for tag, attrs in page.tags:
            if tag == 'img':
                assert 'alt' in attrs and 'width' in attrs and 'height' in attrs
            for attr in ('src', 'href'):
                target = attrs.get(attr, '')
                if target.startswith('#'):
                    assert target[1:] in page.ids, target
                elif target.startswith('/'):
                    path = output / urlsplit(target).path.lstrip('/')
                    assert path.exists(), (locale, target)
        manifest = json.loads((output / locale / 'site.webmanifest').read_text())
        assert manifest['lang'] == locale and manifest['start_url'] == expected_path
        for icon in manifest['icons']:
            assert (output / icon['src'].lstrip('/')).exists()
        if locale != 'en-US':
            for key, value in messages.items():
                if len(catalogs['en-US'][key]) > 40:
                    assert value != catalogs['en-US'][key], (locale, key)
    app = (output / 'app/index.html').read_text()
    assert 'old.svg' not in app and 'integrity="old"' not in app and '>App<' in app
    icon = next(attrs['href'] for tag, attrs in Page(app).tags if attrs.get('type') == 'image/svg+xml')
    assert icon == '/favicon.svg'
    assert (output / icon.lstrip('/')).read_bytes() == (ROOT / 'site/favicon.svg').read_bytes()
    assert not (output / 'sitemap.xml').exists()
    assert not (output / 'CNAME').exists()
    assert (output / 'index.html').read_bytes() == (output / 'en-US/index.html').read_bytes()
    subprocess.run(['node', 'scripts/test_site.cjs', str(output / 'site.js')], cwd=ROOT, check=True)
print(f'All {len(supported)} translations, local links, manifests and icons passed')

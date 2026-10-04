# Website

`index.html` and `site/locales/*.json` generate the 21 localized pages. Run `sh scripts/assemble-site.sh dist` after the browser build, and `python3 scripts/test_site.py` to check local links, language selection, and icon assets.

The site uses the Spanvision Mono palette and the vector CAD illustrations in `preview-plan.svg` and `preview-model.svg`. The former product screenshots remain in the source archive and are not shipped by the site builder. Replace the illustrations with fresh product captures only after the new editor can be built and inspected.

With no `website_url` in `brand.json`, the builder uses relative links and omits CNAME, sitemap, canonical URLs, and absolute social images. The website workflow produces a CI artifact and does not deploy it.

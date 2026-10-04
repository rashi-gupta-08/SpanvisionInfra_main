import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Serve/build the original companion pages from one source, sharing UI tokens. */
export function spanvisionCompanions() {
  const read = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
  function assets() {
    return Object.fromEntries(['index.html', 'workshop.html', 'ar-preview.html'].map(name => [
      name, read(`../ofs-web/${name}`),
    ]).concat([
      ['theme.css', read('./src/styles/tokens.css') + '\n' + read('../ofs-web/theme.css').replace(/@import[^;]+;/, '')],
      ['spanvision-mark.svg', read('./public/spanvision-mark.svg')],
    ]));
  }
  return {
    name: 'spanvision-companions',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].replace(/^\/companion\//, '');
        if (!req.url?.startsWith('/companion/') || !Object.hasOwn(assets(), name)) return next();
        res.setHeader('Content-Type', name.endsWith('.css') ? 'text/css' : name.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8');
        res.end(assets()[name]);
      });
    },
    generateBundle() {
      for (const [name, source] of Object.entries(assets())) {
        this.emitFile({ type: 'asset', fileName: `companion/${name}`, source });
      }
    },
  };
}

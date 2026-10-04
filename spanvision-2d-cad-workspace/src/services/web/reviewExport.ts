/** Composite the drawing and review SVG, without changing the editable project. */
export async function exportReviewPNG(name: string): Promise<void> {
  const source = document.querySelector<HTMLCanvasElement>('[data-review-canvas]');
  const overlay = document.querySelector<SVGSVGElement>('[data-review-markup]');
  if (!source || !overlay) throw new Error('The review canvas is not ready.');
  const bounds = source.getBoundingClientRect();
  const output = document.createElement('canvas');
  output.width = source.width;
  output.height = source.height;
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('PNG rendering is unavailable.');
  ctx.drawImage(source, 0, 0);
  const svg = overlay.cloneNode(true) as SVGSVGElement;
  svg.removeAttribute('class');
  svg.removeAttribute('style');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(bounds.width));
  svg.setAttribute('height', String(bounds.height));
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  svg.querySelectorAll('foreignObject').forEach(node => node.remove());
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Review markup could not be rendered.'));
      image.src = url;
    });
    ctx.drawImage(image, 0, 0, output.width, output.height);
    const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(result => result ? resolve(result) : reject(new Error('PNG export failed.')), 'image/png'));
    const downloadURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadURL;
    link.download = `${name.replace(/[\\/:*?"<>|]/g, '-') || 'Drawing'}-review.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadURL), 1000);
  } finally { URL.revokeObjectURL(url); }
}

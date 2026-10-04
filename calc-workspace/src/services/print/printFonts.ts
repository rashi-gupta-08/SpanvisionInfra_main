import inter from '../../assets/fonts/Inter-Regular.ttf?url';
import interBold from '../../assets/fonts/Inter-Bold.ttf?url';
import space from '../../assets/fonts/SpaceGrotesk-Regular.ttf?url';
import spaceBold from '../../assets/fonts/SpaceGrotesk-Bold.ttf?url';

/** Keep the existing print typography without requesting a font service. */
export function printFontStyles(): string {
  const src = (url: string) => new URL(url, window.location.href).href;
  return `
@font-face { font-family: 'Inter'; font-weight: 400 500; src: url('${src(inter)}') format('truetype'); }
@font-face { font-family: 'Inter'; font-weight: 600 900; src: url('${src(interBold)}') format('truetype'); }
@font-face { font-family: 'Space Grotesk'; font-weight: 400 500; src: url('${src(space)}') format('truetype'); }
@font-face { font-family: 'Space Grotesk'; font-weight: 600 900; src: url('${src(spaceBold)}') format('truetype'); }`;
}

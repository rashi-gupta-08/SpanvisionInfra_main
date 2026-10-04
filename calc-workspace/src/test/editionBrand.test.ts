import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BRAND } from '../config/brand';
import { applyTheme, getInitialTheme } from '../services/theme';
import { deserializeProject } from '../services/file/fileService';
import { generateIfcCostFile } from '../services/ifc/ifcCostGenerator';
import { buildBc3 } from '../services/export/bc3Exporter';
import { getReportLabels } from '../i18n/reportI18n';

describe('edition identity and preference compatibility', () => {
  beforeEach(() => localStorage.clear());
  it('uses the monochrome default only when no preference exists', () => {
    expect(getInitialTheme()).toBe('spanvision-mono');
    localStorage.setItem('ocs-theme', 'light');
    expect(getInitialTheme()).toBe('light');
    localStorage.setItem('ocs:settings', JSON.stringify({ theme: 'dark' }));
    expect(getInitialTheme()).toBe('dark');
  });
  it('recovers a legacy preference when the settings mirror is malformed', () => {
    localStorage.setItem('ocs:settings', '{broken');
    localStorage.setItem('ocs-theme', 'blue');
    expect(getInitialTheme()).toBe('blue');
  });
  it('applies and saves the selected theme', () => {
    applyTheme('spanvision-mono');
    expect(document.documentElement.dataset.theme).toBe('spanvision-mono');
    expect(localStorage.getItem('ocs-theme')).toBe('spanvision-mono');
  });
  it('brands application metadata while retaining IFC compatibility property identifiers', () => {
    const sample = readFileSync('public/data/sample-en.ifcCalc', 'utf8');
    const project = deserializeProject(sample);
    const ifc = generateIfcCostFile(project.schedule, project.items);
    expect(ifc).toContain(`IFCORGANIZATION($,'${BRAND.organization}'`);
    expect(ifc).toContain(BRAND.product);
    expect(ifc).toContain('OCS_ItemProperties');
    expect(ifc).not.toMatch(/OpenAEC|Open Calc Studio/);
    expect(buildBc3(project.schedule, project.items)).toContain(`FIEBDC-3/2004|${BRAND.product}|`);
  });
  it('resolves shared branding in native report labels without disturbing page placeholders', async () => {
    const labels = await getReportLabels('en');
    expect(labels['footer.sampleBrand']).toContain(BRAND.product);
    expect(Object.values(labels).join(' ')).not.toMatch(/\{\{brand(?:Product|Organization)\}\}|OpenAEC|Open Calc Studio/);
  });
});

import * as fs from 'fs';
import * as path from 'path';

const I18N_DIR = __dirname;

function collectKeyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => collectKeyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function readKeyPaths(locale: string, file: string): string[] {
  const filePath = path.join(I18N_DIR, locale, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  return collectKeyPaths(content).sort();
}

describe('i18n key parity', () => {
  const locales = fs
    .readdirSync(I18N_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const [baseLocale, ...otherLocales] = locales;
  const files = fs
    .readdirSync(path.join(I18N_DIR, baseLocale))
    .filter((name) => name.endsWith('.json'));

  it.each(otherLocales)(
    `%s has the same files as "${baseLocale}"`,
    (locale) => {
      const localeFiles = fs
        .readdirSync(path.join(I18N_DIR, locale))
        .filter((name) => name.endsWith('.json'));
      expect(localeFiles.sort()).toEqual(files.sort());
    },
  );

  describe.each(files)('%s', (file) => {
    it.each(otherLocales)(
      `%s has the same keys as "${baseLocale}"`,
      (locale) => {
        expect(readKeyPaths(locale, file)).toEqual(
          readKeyPaths(baseLocale, file),
        );
      },
    );
  });
});

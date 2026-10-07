export interface MenuImportRow {
  readonly category: string;
  readonly name: string;
  readonly description: string;
  readonly price: string;
  readonly priceText: string;
  readonly featured: boolean;
  readonly visible: boolean;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function squareVariationName(itemName: string, variationName: string) {
  const normalized = variationName.trim().toLowerCase();
  if (!normalized || ['regular', 'default', 'standard'].includes(normalized)) return itemName;
  return `${itemName} — ${variationName.trim()}`;
}

export function parseMenuImport(text: string, extension: string): MenuImportRow[] {
  if (extension.toLowerCase() === 'json') {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('JSON must contain an array of menu items.');
    return parsed.map((value, index) => {
      if (!value || typeof value !== 'object')
        throw new Error(`Menu item ${index + 1} is invalid.`);
      const row = value as Record<string, unknown>;
      const name = String(row.name ?? '').trim();
      if (!name) throw new Error(`Menu item ${index + 1} needs a name.`);
      return {
        category: String(row.category ?? row.section ?? 'General').trim() || 'General',
        name,
        description: String(row.description ?? '').trim(),
        price: String(row.price ?? '').trim(),
        priceText: String(row.price_text ?? row.priceText ?? '').trim(),
        featured: row.featured === true || String(row.featured).toLowerCase() === 'true',
        visible: row.visible !== false && String(row.visible).toLowerCase() !== 'false',
      } satisfies MenuImportRow;
    });
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error('CSV needs a header row and at least one menu item.');
  const headers = splitCsvLine(lines[0] ?? '').map((header) =>
    header.toLowerCase().replace(/[\s-]+/g, '_'),
  );
  const read = (cells: string[], ...names: string[]) => {
    const index = names.map((name) => headers.indexOf(name)).find((candidate) => candidate >= 0);
    return index === undefined ? '' : (cells[index] ?? '').trim();
  };
  const squareEnabledColumns = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => header === 'enabled' || header.startsWith('enabled_'))
    .map(({ index }) => index);

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const itemName = read(cells, 'name', 'item', 'title', 'item_name');
    if (!itemName) throw new Error(`CSV row ${index + 2} needs a name.`);
    const name = squareVariationName(itemName, read(cells, 'variation_name', 'variation'));
    const category =
      read(cells, 'category', 'section', 'group') ||
      read(cells, 'categories').split(',')[0]?.trim() ||
      read(cells, 'reporting_category') ||
      'General';
    const featured = read(cells, 'featured', 'highlight').toLowerCase();
    const visible = read(
      cells,
      'visible',
      'published',
      'is_visible',
      'enabled',
      'sellable',
      'square_online_item_visibility',
    ).toLowerCase();
    const squareEnabledValues = squareEnabledColumns
      .map((column) => cells[column]?.trim().toLowerCase() ?? '')
      .filter(Boolean);
    const hasSquareLocationStatus = squareEnabledValues.length > 0;
    const squareEnabled = squareEnabledValues.some((value) =>
      ['true', 'yes', 'y', '1', 'enabled'].includes(value),
    );
    const rawPrice = read(cells, 'price', 'price_dollars');
    const variablePrice = ['variable', 'varies'].includes(rawPrice.toLowerCase());
    return {
      category,
      name,
      description: read(cells, 'description', 'details'),
      price: variablePrice ? '' : rawPrice,
      priceText: read(cells, 'price_text', 'price_label') || (variablePrice ? 'Price varies' : ''),
      featured: featured === 'true' || featured === 'yes' || featured === '1',
      visible: hasSquareLocationStatus
        ? squareEnabled
        : !['false', 'no', '0', 'n', 'disabled', 'hidden', 'archived'].includes(visible),
    } satisfies MenuImportRow;
  });
}

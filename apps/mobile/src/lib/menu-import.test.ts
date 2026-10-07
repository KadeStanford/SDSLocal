import { describe, expect, it } from 'vitest';

import { parseMenuImport } from './menu-import';

describe('menu import', () => {
  it('parses the SDS CSV template and quoted commas', () => {
    expect(
      parseMenuImport(
        'category,name,description,price,price_text,featured,visible\n"Lunch, Specials",Turkey,"Roasted, sliced",12.50,,yes,true',
        'csv',
      ),
    ).toEqual([
      {
        category: 'Lunch, Specials',
        name: 'Turkey',
        description: 'Roasted, sliced',
        price: '12.50',
        priceText: '',
        featured: true,
        visible: true,
      },
    ]);
  });

  it('imports Square Dashboard CSV names, categories, descriptions, prices, and variations', () => {
    expect(
      parseMenuImport(
        [
          'Item Name,Variation Name,Description,SKU,Categories,Price,Enabled Main Street',
          'Latte,Regular,Espresso and milk,001,Drinks,4.50,Y',
          'Latte,Oat milk,Espresso with oat milk,002,Drinks,5.25,Y',
        ].join('\n'),
        'csv',
      ),
    ).toEqual([
      {
        category: 'Drinks',
        name: 'Latte',
        description: 'Espresso and milk',
        price: '4.50',
        priceText: '',
        featured: false,
        visible: true,
      },
      {
        category: 'Drinks',
        name: 'Latte — Oat milk',
        description: 'Espresso with oat milk',
        price: '5.25',
        priceText: '',
        featured: false,
        visible: true,
      },
    ]);
  });

  it('keeps variable price rows visible but marks them as not order-priced', () => {
    expect(
      parseMenuImport(
        'Item Name,Variation Name,Description,Categories,Price,Enabled Main Street\nCatering,Event,Ask about catering,Other,Variable,N',
        'csv',
      ),
    ).toEqual([
      {
        category: 'Other',
        name: 'Catering — Event',
        description: 'Ask about catering',
        price: '',
        priceText: 'Price varies',
        featured: false,
        visible: false,
      },
    ]);
  });

  it('keeps Square non-sellable items hidden', () => {
    expect(
      parseMenuImport(
        'Item Name,Variation Name,Description,Category,Price,Sellable\nArchived pie,Regular,Seasonal,Pastry,4.00,N',
        'csv',
      )[0]?.visible,
    ).toBe(false);
  });

  it('still parses JSON menu files', () => {
    expect(parseMenuImport('[{"name":"Soup","category":"Lunch","price":"8.00"}]', 'json')).toEqual([
      {
        category: 'Lunch',
        name: 'Soup',
        description: '',
        price: '8.00',
        priceText: '',
        featured: false,
        visible: true,
      },
    ]);
  });
});

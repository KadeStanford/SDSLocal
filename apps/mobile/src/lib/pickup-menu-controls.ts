import { cartReview, itemIssue, menuCategories, setCartLine } from './pickup-order-flow';
import { money, type CartLine, type Product } from './square-commerce-core';

export function hasCustomization(product: Product) {
  return product.groups.some((g) => g.min > 0 || (g.max > 0 && g.modifiers.length > 0));
}
export function simpleQuantity(cart: readonly CartLine[], product: Product) {
  return cart
    .filter((l) => l.variationId === product.id && !l.modifierIds.length && !l.rewardClaim)
    .reduce((sum, l) => sum + l.quantity, 0);
}
/** Local cart only: no quote, checkout, payment or order side effects. */
export function changeSimpleQuantity(cart: CartLine[], product: Product, delta: 1 | -1) {
  if (hasCustomization(product)) throw new Error('Choose this item’s options first.');
  const quantity = simpleQuantity(cart, product);
  const next = quantity + delta;
  if (next < 0 || (delta > 0 && next > 20)) throw new Error('You can add up to 20 of this item.');
  const remaining = cart.filter(
    (l) => l.variationId !== product.id || l.modifierIds.length > 0 || !!l.rewardClaim,
  );
  if (!next) return remaining;
  const issue = itemIssue(product, [], Math.min(next, 20));
  if (issue && delta > 0) throw new Error(issue);
  // Older saved carts may contain duplicate plain lines; preserve their quantity
  // while allowing decrement, keeping the established 20-per-line domain limit.
  let result = remaining;
  for (let left = next; left > 0; left -= 20) {
    result = setCartLine(result, { ...product, available: true }, [], Math.min(left, 20), null);
  }
  return result;
}
export function modifierGroupIssue(group: Product['groups'][number], ids: readonly string[]) {
  const count = group.modifiers.filter((m) => ids.includes(m.id)).length;
  return count < group.min
    ? `Select ${group.min - count} more ${group.min - count === 1 ? 'option' : 'options'}.`
    : count > group.max
      ? `Choose no more than ${group.max}.`
      : null;
}
export function toggleModifier(group: Product['groups'][number], ids: string[], id: string) {
  if (!group.modifiers.some((m) => m.id === id) || group.max < 1) return ids;
  if (ids.includes(id)) return group.min > 0 && group.max === 1 ? ids : ids.filter((x) => x !== id);
  if (group.max === 1) return [...ids.filter((x) => !group.modifiers.some((m) => m.id === x)), id];
  if (group.modifiers.filter((m) => ids.includes(m.id)).length >= group.max) return ids;
  return [...ids, id];
}
export function refreshedProducts(previous: Product[], current: Product[]) {
  const ids = new Set(current.map((p) => p.id));
  return [
    ...current,
    ...previous.filter((p) => !ids.has(p.id)).map((p) => ({ ...p, available: false })),
  ];
}
export type MenuProductGroup = {
  key: string;
  name: string;
  products: Product[];
};
export type MenuRow =
  | { key: string; kind: 'heading'; name: string }
  | { key: string; kind: 'item'; product: Product; products: Product[] };

/**
 * Square returns one product for each purchasable variation. Keep those
 * variations together in the browse view so a customer sees one menu item,
 * then chooses its size or other variation before adding it to the cart.
 */
export function groupMenuProducts(products: Product[]): MenuProductGroup[] {
  const groups = new Map<string, MenuProductGroup>();
  for (const product of products) {
    const key = `${product.category.trim().toLocaleLowerCase()}\u0000${product.name.trim().toLocaleLowerCase()}`;
    const existing = groups.get(key);
    if (existing) existing.products.push(product);
    else groups.set(key, { key, name: product.name, products: [product] });
  }
  return [...groups.values()];
}
export function filteredMenuRows(
  products: Product[],
  category: string | null,
  search: string,
): MenuRow[] {
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return menuCategories(products)
    .filter((g) => !category || category === g.name)
    .flatMap((g) => {
      const items = groupMenuProducts(g.items).filter((group) =>
        terms.every((term) =>
          group.products.some((p) =>
            `${p.name} ${p.variation} ${p.description} ${g.name}`
              .toLocaleLowerCase()
              .includes(term),
          ),
        ),
      );
      return items.length
        ? [
            { key: `category:${g.name}`, kind: 'heading' as const, name: g.name },
            ...items.map((group) => ({
              key: `item:${group.key}`,
              kind: 'item' as const,
              product: group.products[0]!,
              products: group.products,
            })),
          ]
        : [];
    });
}
export function cartBarSummary(cart: CartLine[], products: Product[]) {
  const review = cartReview(cart, products);
  return {
    ...review,
    label: `View cart (${review.count}) · ${money(review.subtotal, products[0]?.currency ?? 'USD')}`,
  };
}
/** Persist before committing React state, so a failed write leaves the prior cart intact. */
export function commitCartChange(
  next: CartLine[],
  save: (cart: CartLine[]) => boolean,
  commit: (cart: CartLine[]) => void,
) {
  if (!save(next)) return false;
  commit(next);
  return true;
}

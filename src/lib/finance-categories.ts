export type FinanceCategory = { id: string; name: string; color: string; icon: string; parentId: string | null; order: number };

type DefaultMain = [name: string, color: string, icon: string, subs: [name: string, icon: string][]];

const DEFAULT_TREE: DefaultMain[] = [
  ["Food & Drinks", "#F44336", "utensils", [["Bar, cafe", "mug-hot"], ["Restaurant, fast-food", "burger"], ["Groceries", "cart-shopping"]]],
  ["Shopping", "#4FC3F7", "bag-shopping", [["Drug-store, chemist", "prescription-bottle-medical"], ["Leisure time", "puzzle-piece"], ["Stationery, tools", "screwdriver-wrench"], ["Gifts, joy", "gift"], ["Electronics, accessories", "headphones"], ["Pets, animals", "paw"], ["Home, garden", "seedling"], ["Kids", "baby"], ["Health and beauty", "pump-soap"], ["Jewels, accessories", "gem"], ["Clothes & Footwear", "shirt"]]],
  ["Housing", "#FFA726", "house", [["Property insurance", "shield-halved"], ["Maintenance, repairs", "hammer"], ["Services", "broom"], ["Energy, utilities", "bolt"], ["Mortgage", "building-columns"], ["Rent", "key"]]],
  ["Transportation", "#78909C", "bus", [["Business trips", "briefcase"], ["Long distance", "plane"], ["Taxi", "taxi"], ["Public transport", "train-subway"]]],
  ["Vehicle", "#AA00FF", "car", [["Leasing", "file-signature"], ["Vehicle insurance", "car-burst"], ["Rentals", "car-side"], ["Vehicle maintenance", "wrench"], ["Parking", "square-parking"], ["Fuel", "gas-pump"]]],
  ["Life & Entertainment", "#64DD17", "masks-theater", [["Lottery, gambling", "dice"], ["Alcohol, tobacco", "wine-glass"], ["Charity, gifts", "hand-holding-heart"], ["Holiday, trips, hotels", "umbrella-beach"], ["TV, Streaming", "tv"], ["Books, audio, subscriptions", "book"], ["Education, development", "graduation-cap"], ["Hobbies", "palette"], ["Life events", "cake-candles"], ["Culture, sport events", "ticket"], ["Active sport, fitness", "dumbbell"], ["Wellness, beauty", "spa"], ["Health care, doctor", "stethoscope"]]],
  ["Communication, PC", "#536DFE", "laptop", [["Postal services", "envelope"], ["Software, apps, games", "code"], ["Internet", "wifi"], ["Telephony, mobile phone", "phone"]]],
  ["Financial expenses", "#00BFA5", "file-invoice-dollar", [["Child Support", "child"], ["Charges, Fees", "receipt"], ["Advisory", "user-tie"], ["Fines", "gavel"], ["Loans, interests", "hand-holding-dollar"], ["Insurance", "umbrella"], ["Taxes", "landmark"]]],
  ["Investments", "#FF4081", "chart-line", [["Collections", "box-archive"], ["Savings", "piggy-bank"], ["Financial investments", "arrow-trend-up"], ["Vehicles, chattels", "truck"], ["Realty", "building"]]],
  ["Income", "#FBC02D", "sack-dollar", [["Gifts", "gift"], ["Child support", "child"], ["Refunds (tax, purchase)", "rotate-left"], ["Lottery, gambling", "dice"], ["Checks, coupons", "ticket-simple"], ["Lending, renting", "handshake"], ["Dues & grants", "award"], ["Rental income", "key"], ["Sale", "tags"], ["Interests, dividends", "percent"], ["Wage, invoices", "money-bill-wave"]]],
  ["Others", "#9E9E9E", "ellipsis", [["Missing", "circle-question"], ["Transfer fee", "right-left"], ["Deleted category", "trash-can"]]],
];

function slug(text: string) {
  return text.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const DEFAULT_CATEGORIES: FinanceCategory[] = DEFAULT_TREE.flatMap(([name, color, icon, subs], index) => {
  const id = slug(name);
  return [
    { id, name, color, icon, parentId: null, order: index },
    ...subs.map(([subName, subIcon], subIndex) => ({ id: `${id}--${slug(subName)}`, name: subName, color, icon: subIcon, parentId: id, order: subIndex })),
  ];
});

export const MISSING_CATEGORY_ID = "others--missing";
export const DELETED_CATEGORY_ID = "others--deleted-category";
const DELETED_FALLBACK = DEFAULT_CATEGORIES.find((category) => category.id === DELETED_CATEGORY_ID)!;

export const TRANSFER_BADGE = { color: "#607D8B", icon: "right-left" };
export const DEBT_BADGE = { color: "#8D6E63", icon: "handshake" };

export function recordBadge(categories: FinanceCategory[], record: { type: string; category: string }) {
  if (record.type === "transfer") return TRANSFER_BADGE;
  if (record.type === "debt") return DEBT_BADGE;
  return resolveCategory(categories, record.category);
}

export function isLockedCategory(id: string) {
  return id === DELETED_CATEGORY_ID;
}

const byOrder = (a: FinanceCategory, b: FinanceCategory) => a.order - b.order || a.name.localeCompare(b.name);

export function categoryTree(categories: FinanceCategory[]) {
  const ids = new Set(categories.map((category) => category.id));
  const mains = categories.filter((category) => !category.parentId || !ids.has(category.parentId)).sort(byOrder);
  return mains.flatMap((main) => [
    { category: main, depth: 0 as const },
    ...categories.filter((category) => category.parentId === main.id).sort(byOrder).map((category) => ({ category, depth: 1 as const })),
  ]);
}

export function resolveCategory(categories: FinanceCategory[], id: string) {
  return categories.find((category) => category.id === id) ?? categories.find((category) => category.id === DELETED_CATEGORY_ID) ?? DELETED_FALLBACK;
}

export function mainCategory(categories: FinanceCategory[], category: FinanceCategory) {
  return (category.parentId && categories.find((item) => item.id === category.parentId)) || category;
}

export function categoryPath(categories: FinanceCategory[], category: FinanceCategory) {
  const main = mainCategory(categories, category);
  return main.id === category.id ? category.name : `${main.name} › ${category.name}`;
}

export function categoryValidation(category: FinanceCategory, categories: FinanceCategory[]) {
  const existing = categories.find((item) => item.id === category.id);
  if (isLockedCategory(category.id) && existing) return "This category is locked.";
  const name = category.name.trim();
  if (!name || name.length > 60) return "Enter a category name of up to 60 characters.";
  if (!/^#[0-9a-f]{6}$/i.test(category.color)) return "Choose a six-digit hexadecimal color, such as #F44336.";
  if (!category.icon || category.icon.length > 60) return "Choose an icon.";
  if (!Number.isFinite(category.order)) return "Enter a valid order.";
  if (category.parentId !== null) {
    const parent = categories.find((item) => item.id === category.parentId);
    if (!parent || parent.parentId !== null || parent.id === category.id) return "Choose a main category as the parent.";
    if (categories.some((item) => item.parentId === category.id)) return "A category with subcategories must stay a main category.";
  }
  if (categories.some((item) => item.id !== category.id && item.parentId === category.parentId && item.name.trim().toLowerCase() === name.toLowerCase())) return "A category with this name already exists here.";
  return null;
}

export function categoryDeleteBlocker(id: string, categories: FinanceCategory[]) {
  if (isLockedCategory(id)) return "This category is locked.";
  if (categories.some((category) => category.parentId === id)) return "Delete its subcategories first.";
  return null;
}

export function nextCategoryOrder(categories: FinanceCategory[], parentId: string | null) {
  return categories.filter((category) => category.parentId === parentId).reduce((max, category) => Math.max(max, category.order + 1), 0);
}

export function resetCategories(current: FinanceCategory[], newId: () => string = () => crypto.randomUUID()) {
  const key = (name: string) => name.trim().toLowerCase();
  const currentMains = current.filter((category) => category.parentId === null);
  const taken = new Set(current.map((category) => category.id));
  const ids = new Map<string, string>();
  for (const category of DEFAULT_CATEGORIES) {
    if (isLockedCategory(category.id)) { ids.set(category.id, category.id); continue; }
    const parentName = category.parentId ? DEFAULT_CATEGORIES.find((item) => item.id === category.parentId)!.name : null;
    const match = parentName === null
      ? currentMains.find((item) => key(item.name) === key(category.name))
      : current.find((item) => item.parentId !== null && key(item.name) === key(category.name) && currentMains.some((main) => main.id === item.parentId && key(main.name) === key(parentName)));
    ids.set(category.id, match?.id ?? (taken.has(category.id) ? newId() : category.id));
  }
  return DEFAULT_CATEGORIES.map((category) => ({ ...category, id: ids.get(category.id)!, parentId: category.parentId ? ids.get(category.parentId)! : null }));
}

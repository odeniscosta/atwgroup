export type CatalogCategory = {
  slug: string;
  name: string;
  eyebrow: string;
  icon: string;
  tone: string;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  storeName: string;
  storeSlug: string;
  price: number;
  oldPrice?: number;
  installment: string;
  rating: number;
  reviews: number;
  sold: string;
  image: string;
  badge?: string;
  pix?: string;
};

export type CatalogStore = {
  slug: string;
  name: string;
  tagline: string;
  city: string;
  rating: number;
  products: number;
  initials: string;
  tone: string;
};

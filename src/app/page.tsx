import React from 'react';
import prisma from '@/lib/prisma';
import ClientStorefront from '@/components/ClientStorefront';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Fresh dynamic rendering

export default async function HomePage() {
  let categories: Array<{ id: string; name: string; slug: string; description: string | null }> = [];
  let rawProducts: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    isAvailable: boolean;
    isBestSeller: boolean;
    categoryId: string | null;
    category: { id: string; name: string; slug: string } | null;
  }> = [];
  let rawSettings: Array<{ key: string; value: string }> = [];
  let rawBranches: Array<{
    id: string;
    code: string;
    name: string;
    city: string;
    address: string;
    hotline: string;
    openingHours: string;
    managerName: string | null;
    googleMapsUrl: string | null;
    image: string | null;
    isActive: boolean;
    sortOrder: number;
  }> = [];

  try {
    const [dbCategories, dbProducts, dbSettings, dbBranches] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: 'desc' } }),
      prisma.setting.findMany(),
      prisma.branch.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    ]);

    categories = dbCategories;
    rawProducts = dbProducts;
    rawSettings = dbSettings;
    rawBranches = dbBranches;
  } catch (error) {
    console.error('Error loading storefront data from database:', error);
  }

  const settingsMap: Record<string, string> = {};
  rawSettings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  // Plain objects for Client Components serialization
  const serializedCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || undefined,
  }));

  const serializedProducts = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    price: p.price,
    image: p.image || undefined,
    isAvailable: p.isAvailable,
    isBestSeller: p.isBestSeller,
    categoryId: p.categoryId,
    category: p.category
      ? {
          id: p.category.id,
          name: p.category.name,
          slug: p.category.slug,
        }
      : undefined,
  }));

  const serializedBranches = rawBranches.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    city: b.city,
    address: b.address,
    hotline: b.hotline,
    openingHours: b.openingHours,
    managerName: b.managerName || undefined,
    googleMapsUrl: b.googleMapsUrl || undefined,
    image: b.image || undefined,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
  }));

  return (
    <ClientStorefront
      categories={serializedCategories}
      products={serializedProducts}
      settings={settingsMap}
      initialBranches={serializedBranches}
    />
  );
}

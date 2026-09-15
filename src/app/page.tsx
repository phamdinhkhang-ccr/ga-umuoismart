import React from 'react';
import prisma from '@/lib/prisma';
import ClientStorefront from '@/components/ClientStorefront';

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

  try {
    categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    rawProducts = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    rawSettings = await prisma.setting.findMany();
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

  return (
    <ClientStorefront
      categories={serializedCategories}
      products={serializedProducts}
      settings={settingsMap}
    />
  );
}

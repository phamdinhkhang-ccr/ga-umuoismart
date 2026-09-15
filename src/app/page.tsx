import React from 'react';
import prisma from '@/lib/prisma';
import ClientStorefront from '@/components/ClientStorefront';

export const revalidate = 0; // Fresh dynamic rendering

export default async function HomePage() {
  // Fetch data from database
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  const rawProducts = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  const rawSettings = await prisma.setting.findMany();
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

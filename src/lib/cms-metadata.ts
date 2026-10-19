import type { Metadata } from "next";
import { dbStore } from "./db/store";

export async function getCmsPageMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  const page = await dbStore.getCmsPageAsync(slug);
  const publishedPage = page?.isPublished ? page : null;
  return {
    title: publishedPage?.metaTitle || publishedPage?.titleAr || fallbackTitle,
    description: publishedPage?.metaDescription || publishedPage?.contentAr.slice(0, 320),
  };
}

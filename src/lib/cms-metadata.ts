import type { Metadata } from "next";
import { dbStore } from "./db/store";

export function getCmsPageMetadata(slug: string, fallbackTitle: string): Metadata {
  const page = dbStore.getCmsPage(slug);
  const publishedPage = page?.isPublished ? page : null;
  return {
    title: publishedPage?.metaTitle || publishedPage?.titleAr || fallbackTitle,
    description: publishedPage?.metaDescription || publishedPage?.contentAr.slice(0, 320),
  };
}

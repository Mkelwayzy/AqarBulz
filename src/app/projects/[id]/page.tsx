import React from "react";
import ProjectShowcaseView, { DEFAULT_OWJ_KHOBAR_PROJECT, ProjectShowcaseData } from "@/components/project/ProjectShowcaseView";
import { dbStore } from "@/lib/db/store";
import { createClient as createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const projectId = params.id;

  // 1. If it's the benchmark or default project "owj-khobar" or "1"
  if (projectId === "owj-khobar" || projectId === "default") {
    return <ProjectShowcaseView project={DEFAULT_OWJ_KHOBAR_PROJECT} />;
  }

  // 2. Fetch from local store or Supabase cloud
  let projectData: ProjectShowcaseData = { ...DEFAULT_OWJ_KHOBAR_PROJECT, id: projectId };

  try {
    const localProp = dbStore.getRawPropertyById(projectId);
    if (localProp) {
      projectData = {
        id: localProp.id,
        title: localProp.title,
        developerName: (localProp as any).developerName || "مطور معتمد",
        developerLogo: (localProp as any).developerLogo || "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&q=80",
        locationText: localProp.addressDetails || "شارع الأمير تركي ، حي الكورنيش ، الخبر",
        city: "الخبر",
        lat: localProp.lat || 26.3023,
        lng: localProp.lng || 50.2195,
        tags: (localProp as any).projectDetails?.tags || (localProp.amenities?.length ? localProp.amenities.slice(0, 4) : ["متاح", "وحدات جاهزة", "مكاتب للإيجار", "محل للإيجار"]),
        totalUnitsCount: (localProp as any).projectDetails?.totalUnitsCount || 18,
        minAreaSqM: (localProp as any).projectDetails?.minAreaSqM || localProp.areaSqM || 325,
        maxAreaSqM: (localProp as any).projectDetails?.maxAreaSqM || 2100,
        minPrice: (localProp as any).projectDetails?.minPrice || localProp.price || 70000,
        maxPrice: (localProp as any).projectDetails?.maxPrice || (localProp.price ? localProp.price * 3 : 290000),
        currency: localProp.currency === "SAR" ? "ريال" : "ريال",
        description: localProp.description || DEFAULT_OWJ_KHOBAR_PROJECT.description,
        amenities: localProp.amenities && localProp.amenities.length > 0
          ? localProp.amenities.map((a: string) => ({ key: a, label: a }))
          : DEFAULT_OWJ_KHOBAR_PROJECT.amenities,
        nearbyLandmarks: (localProp as any).projectDetails?.nearbyLandmarks || DEFAULT_OWJ_KHOBAR_PROJECT.nearbyLandmarks,
        images: localProp.images && localProp.images.length > 0 ? localProp.images : DEFAULT_OWJ_KHOBAR_PROJECT.images,
        subUnits: (localProp as any).projectDetails?.subUnits || DEFAULT_OWJ_KHOBAR_PROJECT.subUnits,
      };
    } else {
      // Check cloud database
      const supabase = createSupabaseServerClient();
      const { data: cloudProp } = await supabase
        .from("properties")
        .select(`*, property_images(url)`)
        .eq("id", projectId)
        .maybeSingle();

      if (cloudProp) {
        const imgs = Array.isArray(cloudProp.property_images) && cloudProp.property_images.length > 0
          ? cloudProp.property_images.map((i: any) => i.url)
          : DEFAULT_OWJ_KHOBAR_PROJECT.images;

        projectData = {
          id: cloudProp.id,
          title: cloudProp.title,
          developerName: "مطور معتمد",
          developerLogo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&q=80",
          locationText: cloudProp.address_details || "شارع الأمير تركي ، حي الكورنيش ، الخبر",
          city: "الخبر",
          lat: Number(cloudProp.exact_lat || 26.3023),
          lng: Number(cloudProp.exact_lng || 50.2195),
          tags: ["متاح", "مكاتب للإيجار", "محل للإيجار", "وحدات جاهزة"],
          totalUnitsCount: 18,
          minAreaSqM: Number(cloudProp.area_sqm || 325),
          maxAreaSqM: 2100,
          minPrice: Number(cloudProp.price || 70000),
          maxPrice: 290000,
          currency: "ريال",
          description: cloudProp.description || DEFAULT_OWJ_KHOBAR_PROJECT.description,
          amenities: DEFAULT_OWJ_KHOBAR_PROJECT.amenities,
          nearbyLandmarks: DEFAULT_OWJ_KHOBAR_PROJECT.nearbyLandmarks,
          images: imgs,
          subUnits: DEFAULT_OWJ_KHOBAR_PROJECT.subUnits,
        };
      }
    }
  } catch (e) {
    // Graceful fallback to default reference project
  }

  return <ProjectShowcaseView project={projectData} />;
}

if (hasCentralDb) {
      const isUuid = UUID_REGEX.test(propertyId);
      const supabaseAdmin = createAdminClient();
      let query = supabaseAdmin
        .from("properties")
        .select("id, title, slug, status, advertiser_id, user_id, owner_id, price, project_details");

      if (isUuid) {
        query = query.eq("id", propertyId);
      } else {
        query = query.eq("slug", propertyId);
      }

      const { data: cloudData, error: queryErr } = await query.maybeSingle();
      if (queryErr && isProd) {
        return NextResponse.json(
          {
            error: `فشل التحقق من العقار في قاعدة البيانات المركزية: ${queryErr.message}`,
          },
          { status: 503 }
        );
      }
      if (cloudData) {
        canonicalPropId = cloudData.id;
        propertyTitle = cloudData.title;
        propertySlug = cloudData.slug;
        propertyPrice = cloudData.price ? Number(cloudData.price) : undefined;
        advertiserId =
          cloudData.advertiser_id ||
          cloudData.user_id ||
          cloudData.owner_id ||
          cloudData.project_details?.creatorSessionId ||
          "admin";
        propertyStatus = cloudData.status;
      }
    }

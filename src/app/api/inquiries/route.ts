if (hasCentralDb && isPropUuid) {
      const supabase = getPrivilegedSupabaseClient();
      const validSeekerId = UUID_REGEX.test(user.id) ? user.id : null;
      const validAdvertiserId = UUID_REGEX.test(finalAdvId) ? finalAdvId : null;

      try {
        let dedupQuery = supabase
          .from("inquiries")
          .select("*")
          .eq("property_id", canonicalPropId)
          .eq("message", message.trim())
          .order("created_at", { ascending: false })
          .limit(1);

        if (validSeekerId) {
          dedupQuery = dedupQuery.eq("seeker_id", validSeekerId);
        } else {
          dedupQuery = dedupQuery.eq("seeker_phone", finalSeekerPhone);
        }

        const { data: recentRows } = await dedupQuery;
        const recentRow = recentRows?.[0];
        if (
          recentRow &&
          Date.now() - new Date(recentRow.created_at).getTime() < 15000
        ) {
          return NextResponse.json({
            success: true,
            inquiry: {
              id: recentRow.id,
              propertyId: recentRow.property_id,
              propertyTitle,
              propertySlug,
              propertyPrice,
              seekerId: recentRow.seeker_id || user.id,
              seekerName: recentRow.seeker_name,
              seekerPhone: recentRow.seeker_phone,
              seekerEmail: recentRow.seeker_email,
              advertiserId: recentRow.advertiser_id || finalAdvId,
              message: recentRow.message,
              preferredContact: recentRow.preferred_contact || "call",
              status: recentRow.status || "new",
              createdAt: recentRow.created_at,
              lastMessageAt: recentRow.updated_at || recentRow.created_at,
            },
            deduplicated: true,
          });
        }
      } catch {}

      const inquiryPayload = {
        property_id: canonicalPropId,
        seeker_id: validSeekerId,
        advertiser_id: validAdvertiserId,
        seeker_name: finalSeekerName,
        seeker_phone: finalSeekerPhone,
        seeker_email: finalSeekerEmail,
        message: message.trim(),
        preferred_contact: preferredContact || "call",
        status: "new",
      };

      let { data: cloudInquiry, error: cloudErr } = await supabase
        .from("inquiries")
        .insert(inquiryPayload)
        .select("*")
        .single();

      if (
        cloudErr &&
        (cloudErr.code === "23503" || cloudErr.message?.includes("foreign key"))
      ) {
        const isSeekerFk = cloudErr.message?.includes("seeker_id");
        const isAdvFk = cloudErr.message?.includes("advertiser_id");
        const retryPayload = {
          ...inquiryPayload,
          seeker_id: isSeekerFk || !isAdvFk ? null : inquiryPayload.seeker_id,
          advertiser_id: isAdvFk || !isSeekerFk ? null : inquiryPayload.advertiser_id,
        };
        const retryRes = await supabase
          .from("inquiries")
          .insert(retryPayload)
          .select("*")
          .single();
        cloudInquiry = retryRes.data;
        cloudErr = retryRes.error;
      }

      if (cloudErr || !cloudInquiry) {
        return NextResponse.json(
          {
            error: `فشل حفظ طلب التواصل في قاعدة البيانات المركزية: ${cloudErr?.message || "Unknown error"}`,
          },
          { status: 503 }
        );
      }

      const cloudInquiryId = cloudInquiry.id;

      const initialMsgPayload = {
        inquiry_id: cloudInquiryId,
        sender_id: validSeekerId,
        sender_name: finalSeekerName,
        sender_role: "buyer",
        content: message.trim(),
        is_admin_note: false,
        is_read: false,
      };

      let { data: insertedMsg, error: msgErr } = await supabase
        .from("inquiry_messages")
        .insert(initialMsgPayload)
        .select("*")
        .single();

      if (
        msgErr &&
        initialMsgPayload.sender_id !== null &&
        (msgErr.code === "23503" || msgErr.message?.includes("foreign key"))
      ) {
        const retryMsg = await supabase
          .from("inquiry_messages")
          .insert({
            ...initialMsgPayload,
            sender_id: null,
          })
          .select("*")
          .single();
        insertedMsg = retryMsg.data;
        msgErr = retryMsg.error;
      }

      const persistedInquiry = {
        id: cloudInquiryId,
        propertyId: canonicalPropId,
        propertyTitle,
        propertySlug,
        propertyPrice,
        seekerId: user.id,
        seekerName: finalSeekerName,
        seekerPhone: finalSeekerPhone,
        seekerEmail: finalSeekerEmail || undefined,
        advertiserId: finalAdvId,
        message: message.trim(),
        preferredContact: preferredContact || "call",
        status: cloudInquiry.status || "new",
        createdAt: cloudInquiry.created_at,
        lastMessageAt: cloudInquiry.updated_at || cloudInquiry.created_at,
        messages: insertedMsg
          ? [
              {
                id: insertedMsg.id,
                inquiryId: cloudInquiryId,
                senderId: insertedMsg.sender_id || user.id,
                senderName: insertedMsg.sender_name || finalSeekerName,
                senderRole: insertedMsg.sender_role || "buyer",
                content: insertedMsg.content,
                createdAt: insertedMsg.created_at,
                isRead: false,
              },
            ]
          : [],
      };

      return NextResponse.json({ success: true, inquiry: persistedInquiry });
    }

    if (isProd) {
      return NextResponse.json(
        { error: "قاعدة البيانات المركزية غير مهيأة لحفظ طلب التواصل" },
        { status: 503 }
      );
    }

    const existingLocalForSeeker = dbStore.getInquiriesForSeeker(
      user.id,
      finalSeekerPhone,
      finalSeekerEmail
    );
    const nowMs = Date.now();
    const recentIdentical = existingLocalForSeeker.find(
      (i) =>
        i.propertyId === canonicalPropId &&
        i.message.trim() === message.trim() &&
        nowMs - new Date(i.createdAt).getTime() < 15000
    );
    if (recentIdentical) {
      return NextResponse.json({
        success: true,
        inquiry: recentIdentical,
        deduplicated: true,
      });
    }

    const inquiry = dbStore.createInquiry({
      propertyId: canonicalPropId,
      propertyTitle,
      propertySlug,
      propertyPrice,
      seekerId: user.id,
      seekerName: finalSeekerName,
      seekerPhone: finalSeekerPhone,
      seekerEmail: finalSeekerEmail || undefined,
      advertiserId: finalAdvId,
      message: message.trim(),
      preferredContact: preferredContact || "call",
    });

    return NextResponse.json({ success: true, inquiry });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطأ أثناء إرسال طلب التواصل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
} // <--- قوس إغلاق دالة POST الأساسية الهام جداً

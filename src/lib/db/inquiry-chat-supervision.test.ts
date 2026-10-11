import test from "node:test";
import assert from "node:assert/strict";
import { dbStore } from "./store";

test("Inquiry Private Chat with Admin Supervision & Meet Ghamr Taxonomy", async (t) => {
  await t.test("1. Creating an inquiry auto-seeds the private chat with buyer message", () => {
    const inquiry = dbStore.createInquiry({
      propertyId: "prop-mg-001",
      propertyTitle: "شقة ميت غمر المطلة على النيل",
      seekerId: "usr-seeker-01",
      seekerName: "أحمد عبد الرحمن",
      seekerPhone: "01012345678",
      seekerEmail: "ahmed@example.com",
      advertiserId: "usr-broker-01",
      message: "أرغب في تحديد موعد لمعاينة الشقة غداً عصراً",
      preferredContact: "call",
    });

    assert.ok(inquiry.id, "Inquiry ID must exist");
    assert.equal(inquiry.status, "new");
    assert.ok(inquiry.messages, "Messages array must exist");
    assert.equal(inquiry.messages.length, 1);
    assert.equal(inquiry.messages[0].content, "أرغب في تحديد موعد لمعاينة الشقة غداً عصراً");
    assert.equal(inquiry.messages[0].senderRole, "buyer");
    assert.equal(inquiry.messages[0].senderName, "أحمد عبد الرحمن");
  });

  await t.test("2. Advertiser (owner/broker) replies in the private chat", () => {
    const inquiries = dbStore.getAllInquiriesForAdmin();
    const targetInq = inquiries[0];
    assert.ok(targetInq);

    const reply = dbStore.addInquiryMessage(targetInq.id, {
      senderId: "usr-broker-01",
      senderName: "المكتب العقاري المعتمد",
      senderRole: "broker",
      content: "أهلاً بك يا فندم، الموعد مناسب جداً في تمام الساعة 4 عصراً بمقر العقار",
    });

    assert.ok(reply);
    assert.equal(reply.senderRole, "broker");

    const history = dbStore.getInquiryMessages(targetInq.id);
    assert.equal(history.length, 2);
    assert.equal(history[1].content, "أهلاً بك يا فندم، الموعد مناسب جداً في تمام الساعة 4 عصراً بمقر العقار");
  });

  await t.test("3. Platform Administration inspects and sends supervisory guidance note", () => {
    const inquiries = dbStore.getAllInquiriesForAdmin();
    const targetInq = inquiries[0];
    assert.ok(targetInq);

    const adminNote = dbStore.addInquiryMessage(targetInq.id, {
      senderId: "admin-platform-01",
      senderName: "إدارة منصة نبض العقار",
      senderRole: "admin",
      content: "تنبيه إداري: حرصاً على سلامتكم وأمان المعاملة، يرجى فحص سندات الملكية الرسمية قبل دفع أي مبالغ مالية.",
      isAdminNote: true,
    });

    assert.ok(adminNote);
    assert.equal(adminNote.senderRole, "admin");
    assert.equal(adminNote.isAdminNote, true);

    const fullHistory = dbStore.getInquiryMessages(targetInq.id);
    assert.equal(fullHistory.length, 3);
    assert.equal(fullHistory[2].isAdminNote, true);
  });

  await t.test("4. Taxonomy contains Meet Ghamr center and comprehensive villages", () => {
    const districts = dbStore.getDistricts();
    const meetGhamrDistricts = districts.filter(
      (d) => d.cityId === "city-dakahlia" || d.id.startsWith("dist-meet-")
    );

    assert.ok(meetGhamrDistricts.length >= 40, "Meet Ghamr must include 40+ villages and districts");
    const cityDistrict = meetGhamrDistricts.find((d) => d.id === "dist-meet-ghamr-city");
    assert.ok(cityDistrict, "Meet Ghamr central city must be present");
    assert.equal(cityDistrict.nameAr, "مدينة ميت غمر (المركز)");

    const daqados = meetGhamrDistricts.find((d) => d.id === "dist-daqados");
    assert.ok(daqados, "Daqados village must be present");
    assert.equal(daqados.nameAr, "دقادوس");

    const tafahna = meetGhamrDistricts.find((d) => d.id === "dist-tafahna-al-ashraf");
    assert.ok(tafahna, "Tafahna Al-Ashraf village must be present");
    assert.equal(tafahna.nameAr, "تفهنا الأشراف");
  });
});

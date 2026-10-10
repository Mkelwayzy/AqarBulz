import fs from "fs";
import path from "path";
import {
  SmartFeaturesConfig,
  ReversePropertyRequest,
  EngineeringInspectionBooking,
  BrokerReview,
  CompoundMasterplan,
  AqarReelsItem,
  InvestorPortfolioItem,
  MarketIndexDistrictTrend,
} from "../types/smartFeatures";

const DATA_DIR = path.join(process.cwd(), ".data");
const CONFIG_FILE = path.join(DATA_DIR, "smart_features_config.json");
const REVERSE_REQUESTS_FILE = path.join(DATA_DIR, "smart_features_requests.json");
const INSPECTIONS_FILE = path.join(DATA_DIR, "smart_features_inspections.json");
const BROKER_REVIEWS_FILE = path.join(DATA_DIR, "smart_features_reviews.json");
const PORTFOLIO_FILE = path.join(DATA_DIR, "smart_features_portfolio.json");

const defaultSmartConfig: SmartFeaturesConfig = {
  version: "2.0.0",
  updatedAt: new Date().toISOString(),
  updatedBy: "system_admin",

  features: {
    // Stage 1: Financial & Valuation Engine
    inflationHedgeCalculator: true,
    resaleOverpriceSimulator: true,
    fairPriceIndexTracker: true,
    comprehensiveRoiYield: true,
    shortTermRentalEstimator: true,

    // Stage 2: Geospatial & Environmental
    commuteTimeIsochrone: true,
    sunWindOrientationSimulator: true,
    neighborhoodPoiHeatmaps: true,
    infrastructureRadar: true,
    neighborhoodComparisonRadar: true,

    // Stage 3: Interactive UX & Engagement
    multiPropertyComparator: true,
    oneClickBrochureWhatsApp: true,
    expatDiasporaHub: true,
    reversePropertyRequests: true,
    silentPriceDropAlerts: true,

    // Stage 4: Trust, Verification & Inspection
    verifiedOwnerBrokerBadges: true,
    priceUndercuttingShield: true,
    engineeringInspectionBooking: true,
    brokerReputationReviews: true,
    maskedContactAntiSpam: true,

    // Stage 5: AI & Immersive Experiences
    aiVirtualStagingStudio: true,
    dynamicFinishingCostEstimator: true,
    aiListingGenerator: true,
    egyptianDialectAiSearch: true,
    legalContractRiskChecklist: true,

    // Stage 6: Enterprise, Portfolios & Big Data
    aqarReelsVideoFeed: true,
    interactiveCompoundMasterplans: true,
    mortgageBankingMatcher: true,
    investorPortfolioTracker: true,
    aqarPulseMarketIndex: true,
  },

  financialParams: {
    usdToEgpRate: 49.5,
    sarToEgpRate: 13.2,
    aedToEgpRate: 13.48,
    kwdToEgpRate: 161.2,
    goldGram24PriceEgp: 4150,
    annualInflationRatePercent: 26.5,
    bankCertificateAnnualYieldPercent: 23.5,
    realEstateDispositionTaxPercent: 2.5,
    averageAnnualAppreciationRatePercent: 28.0,
  },

  geospatialParams: {
    commuteHubs: [
      {
        id: "hub-new-cairo-90th",
        nameAr: "شارع التسعين الجنوبي (التجمع الخامس)",
        nameEn: "South 90th St, New Cairo",
        lat: 30.0195,
        lng: 31.4368,
        category: "business_hub",
      },
      {
        id: "hub-new-capital-cbd",
        nameAr: "حي المال والأعمال (العاصمة الإدارية)",
        nameEn: "CBD, New Administrative Capital",
        lat: 30.0074,
        lng: 31.7456,
        category: "business_hub",
      },
      {
        id: "hub-smart-village",
        nameAr: "القرية الذكية (طريق إسكندرية الصحراوي)",
        nameEn: "Smart Village, 6th of October",
        lat: 30.0768,
        lng: 31.0205,
        category: "business_hub",
      },
      {
        id: "hub-cairo-airport",
        nameAr: "مطار القاهرة الدولي",
        nameEn: "Cairo International Airport",
        lat: 30.1219,
        lng: 31.4056,
        category: "airport",
      },
      {
        id: "hub-downtown-tahrir",
        nameAr: "وسط البلد (ميدان التحرير)",
        nameEn: "Downtown Tahrir, Cairo",
        lat: 30.0444,
        lng: 31.2357,
        category: "city_center",
      },
    ],
    infrastructureProjects: [
      {
        id: "monorail-east",
        nameAr: "مونوريل شرق النيل (مدينة نصر - العاصمة الإدارية)",
        completionYear: 2026,
        impactRadiusKm: 3.5,
        expectedValueBoostPercent: 25,
        lat: 30.0245,
        lng: 31.512,
      },
      {
        id: "lrt-electric-train",
        nameAr: "القطار الكهربائي الخفيف (LRT)",
        completionYear: 2025,
        impactRadiusKm: 4.0,
        expectedValueBoostPercent: 20,
        lat: 30.155,
        lng: 31.62,
      },
      {
        id: "26-july-expanded",
        nameAr: "توسعات محور 26 يوليو الجديد والقطار السريع",
        completionYear: 2026,
        impactRadiusKm: 5.0,
        expectedValueBoostPercent: 30,
        lat: 30.052,
        lng: 31.07,
      },
    ],
  },

  finishingParams: {
    luxCostPerSqM: 4500,
    superLuxCostPerSqM: 7500,
    ultraLuxCostPerSqM: 12500,
    smartHomeAddonPerSqM: 1800,
    kitchenAndAcAddonPerSqM: 2500,
    estimatedFinishingMonths: 4,
  },

  inspectionParams: {
    baseInspectionFeeEgp: 3500,
    expressDeliveryFeeEgp: 1200,
    certifiedEngineersCount: 18,
    sampleReportUrl: "/reports/sample-inspection.pdf",
  },

  mortgageParams: {
    cbeLowIncomeRatePercent: 3.0,
    cbeMiddleIncomeRatePercent: 8.0,
    commercialMortgageRatePercent: 21.0,
    maxLoanTenureYears: 25,
    maxFinancingRatioPercent: 80,
  },
};

const initialCompoundMasterplans: CompoundMasterplan[] = [
  {
    id: "comp-palm-hills-new-cairo",
    slug: "palm-hills-new-cairo",
    nameAr: "بالم هيلز نيو كايرو",
    nameEn: "Palm Hills New Cairo",
    developerNameAr: "شركة بالم هيلز للتعمير",
    districtNameAr: "التجمع الخامس، القاهرة الجديدة",
    lat: 30.015,
    lng: 31.489,
    totalAreaFeddan: 500,
    deliveryYear: 2026,
    startingPrice: 8500000,
    installmentYearsMax: 8,
    downPaymentPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    masterplanMapUrl: "https://images.unsplash.com/photo-1524813686514-a57563d77d66?auto=format&fit=crop&w=1200&q=80",
    descriptionAr: "كمبوند سكني متكامل يمتد على 500 فدان يجمع بين الفيلات الفاخرة والشقق السكنية مع مساحات خضراء وبحيرات صناعية متصلة ومجمع رياضي دولي.",
    availableUnitsCount: 42,
    amenities: ["نادي رياضي", "مساحات خضراء 80%", "مدارس دولية", "مركز تجاري", "أمن وحراسة 24/7", "بحيرات صناعية"],
  },
  {
    id: "comp-zed-sheikh-zayed",
    slug: "zed-sheikh-zayed",
    nameAr: "أبراج زد الشيخ زايد",
    nameEn: "Zed Towers Sheikh Zayed",
    developerNameAr: "شركة أورا للتطوير العقاري (نجيب ساويرس)",
    districtNameAr: "الشيخ زايد، الجيزة",
    lat: 30.048,
    lng: 30.998,
    totalAreaFeddan: 165,
    deliveryYear: 2026,
    startingPrice: 9200000,
    installmentYearsMax: 7,
    downPaymentPercent: 5,
    coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    masterplanMapUrl: "https://images.unsplash.com/photo-1524813686514-a57563d77d66?auto=format&fit=crop&w=1200&q=80",
    descriptionAr: "مشروع أيقوني يطل مباشرة على حديقة زد المركزية بمدينة الشيخ زايد، بتصميمات عالمية تجمع بين الأبراج السكنية والمناطق الترفيهية والمطاعم الراقية.",
    availableUnitsCount: 29,
    amenities: ["إطلالة حديقة زد 65 فدان", "مول تجاري عالمي", "حمامات سباحة أولمبية", "خدمات فندقية", "جراجات تحت الأرض ذكية"],
  },
  {
    id: "comp-il-bosco-new-capital",
    slug: "il-bosco-new-capital",
    nameAr: "إل بوسكو العاصمة الإدارية",
    nameEn: "IL Bosco New Capital",
    developerNameAr: "مصر إيطاليا العقارية",
    districtNameAr: "المستثمرين، العاصمة الإدارية",
    lat: 30.003,
    lng: 31.698,
    totalAreaFeddan: 200,
    deliveryYear: 2025,
    startingPrice: 6800000,
    installmentYearsMax: 9,
    downPaymentPercent: 10,
    coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    masterplanMapUrl: "https://images.unsplash.com/photo-1524813686514-a57563d77d66?auto=format&fit=crop&w=1200&q=80",
    descriptionAr: "مشروع بيئي مبتكر يتميز بالغابة العمودية والمساحات الشجرية النادرة على النهر الأخضر مباشرة في أرقى مناطق العاصمة الإدارية.",
    availableUnitsCount: 56,
    amenities: ["على النهر الأخضر مباشرة", "الغابة العمودية", "نادي رياضي واجتماعي", "ممشي سياحي ودراجات", "كاميرات مراقبة ذكية"],
  },
];

const initialAqarReels: AqarReelsItem[] = [
  {
    id: "reel-1",
    propertyId: "prop-1",
    title: "شقة دوبلكس مودرن مع حديقة خاصة بالتجمع الخامس",
    locationAr: "حي الياسمين، التجمع الخامس",
    price: 8900000,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-with-living-room-and-kitchen-41480-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    viewsCount: 14200,
    likesCount: 1120,
    advertiserName: "م. أحمد حسني (وسيط معتمد)",
    advertiserRole: "broker",
    tags: ["دوبلكس", "حديقة خاصة", "التجمع الخامس", "قسط"],
  },
  {
    id: "reel-2",
    propertyId: "prop-2",
    title: "بنتهاوس فاخر بإطلالة بانورامية على حديقة زايد",
    locationAr: "الشيخ زايد، الجيزة",
    price: 11500000,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-stylish-luxury-modern-kitchen-and-dining-room-41481-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    viewsCount: 9800,
    likesCount: 840,
    advertiserName: "سارة محمود (المالك مباشرة)",
    advertiserRole: "owner",
    tags: ["بنتهاوس", "روف", "الشيخ زايد", "كاش"],
  },
  {
    id: "reel-3",
    propertyId: "prop-3",
    title: "شقة 3 غرف بحري صريح بالحي الدبلوماسي بالعاصمة",
    locationAr: "الحي الدبلوماسي R7، العاصمة الإدارية",
    price: 5400000,
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-modern-interior-architecture-of-a-room-41483-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    viewsCount: 21300,
    likesCount: 1750,
    advertiserName: "شركة كابيتال العقارية",
    advertiserRole: "broker",
    tags: ["العاصمة الإدارية", "بحري", "قسط 8 سنوات"],
  },
];

const initialReverseRequests: ReversePropertyRequest[] = [
  {
    id: "req-1",
    userId: "usr-req-1",
    userName: "د. هاني الشناوي",
    userPhone: "01091234567",
    title: "مطلوب شقة 3 غرف بحري دور أول أو ثاني بالتجمع الخامس",
    cityId: "cairo",
    districtId: "new-cairo",
    districtNameAr: "التجمع الخامس (النرجس أو اللوتس)",
    category: "apartment",
    transactionType: "sale",
    minBudget: 4500000,
    maxBudget: 6000000,
    minArea: 160,
    maxArea: 210,
    bedrooms: 3,
    notes: "جاهز للكاش فوراً في حال توافر عقار بحري غير مجروح ويفضل عمارة ساكنة وبها أسانسير.",
    urgency: "urgent",
    status: "open",
    offersCount: 4,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "req-2",
    userId: "usr-req-2",
    userName: "م. طارق العوضي",
    userPhone: "01189876543",
    title: "مطلوب تاون هاوس ريسيل في كمبوند بالشيخ زايد",
    cityId: "giza",
    districtId: "sheikh-zayed",
    districtNameAr: "الشيخ زايد / السادس من أكتوبر",
    category: "townhouse",
    transactionType: "sale",
    minBudget: 9000000,
    maxBudget: 13000000,
    minArea: 220,
    maxArea: 300,
    bedrooms: 4,
    notes: "نبحث عن وحدة استلام فوري أو خلال 6 أشهر مع إمكانية استكمال الأقساط.",
    urgency: "within_month",
    status: "open",
    offersCount: 7,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

const initialInspections: EngineeringInspectionBooking[] = [
  {
    id: "insp-101",
    propertyId: "prop-1",
    propertyTitle: "شقة دوبلكس 240م حي النرجس",
    requesterName: "أحمد عبد الله",
    requesterPhone: "01001122334",
    propertyAddress: "عمارة 42، شارع التسعين الجنوبي، حي النرجس",
    preferredDate: "2026-10-15",
    inspectionType: "full_civil_electrical",
    status: "report_ready",
    assignedEngineerName: "م. كريم الباز (استشاري هندسي)",
    scoreOverall: 92,
    notes: "العقار سليم إنشائياً بنسبة 100%، تم فحص لوحة القواطع والسباكة بنجاح، ملاحظة بسيطة على عزل الحمام الثانوي.",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const initialBrokerReviews: BrokerReview[] = [
  {
    id: "rev-1",
    brokerId: "broker-1",
    brokerName: "محمد الكيلاني",
    reviewerName: "م. شريف فهمي",
    ratingOverall: 5,
    ratingAccuracy: 5,
    ratingCommunication: 5,
    ratingPunctuality: 4.8,
    comment: "من أفضل الوسطاء الذين تعاملت معهم، دقة تامة في الأسعار والمعاينة كانت مطابقة تماماً للصور على منصة نبض العقار.",
    isVerifiedDeal: true,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: "rev-2",
    brokerId: "broker-1",
    brokerName: "محمد الكيلاني",
    reviewerName: "د. ريم مصطفى",
    ratingOverall: 4.8,
    ratingAccuracy: 5,
    ratingCommunication: 4.7,
    ratingPunctuality: 5,
    comment: "أمانة ومصداقية وسرعة في استخراج الأوراق الرسمية ومطابقة التراخيص.",
    isVerifiedDeal: true,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

const initialMarketDistrictTrends: MarketIndexDistrictTrend[] = [
  {
    districtId: "new-cairo",
    districtNameAr: "التجمع الخامس (القاهرة الجديدة)",
    avgPricePerSqM: 39500,
    yoyGrowthPercent: 32.4,
    demandScore: 96,
    rentalYieldPercent: 8.9,
    mostDemandedType: "شقق 3 غرف ونصف تشطيب",
  },
  {
    districtId: "sheikh-zayed",
    districtNameAr: "الشيخ زايد (الجيزة)",
    avgPricePerSqM: 42000,
    yoyGrowthPercent: 35.1,
    demandScore: 94,
    rentalYieldPercent: 9.2,
    mostDemandedType: "تاون هاوس وتوين فيلا",
  },
  {
    districtId: "new-capital",
    districtNameAr: "العاصمة الإدارية الجديدة",
    avgPricePerSqM: 33500,
    yoyGrowthPercent: 28.6,
    demandScore: 89,
    rentalYieldPercent: 10.4,
    mostDemandedType: "وحدات إدارية وتجارية وسكني R7",
  },
  {
    districtId: "north-coast",
    districtNameAr: "الساحل الشمالي (رأس الحكمة وسيدي عبد الرحمن)",
    avgPricePerSqM: 68000,
    yoyGrowthPercent: 54.0,
    demandScore: 98,
    rentalYieldPercent: 14.5,
    mostDemandedType: "شاليهات وفيلات شاطئية",
  },
  {
    districtId: "maadi",
    districtNameAr: "المعادي (سرايات ودجلة)",
    avgPricePerSqM: 31000,
    yoyGrowthPercent: 22.0,
    demandScore: 84,
    rentalYieldPercent: 8.1,
    mostDemandedType: "شقق مفروشة لإيجار الأجانب",
  },
];

class SmartFeaturesStore {
  private config: SmartFeaturesConfig | null = null;
  private reverseRequests: ReversePropertyRequest[] | null = null;
  private inspections: EngineeringInspectionBooking[] | null = null;
  private brokerReviews: BrokerReview[] | null = null;
  private portfolioItems: InvestorPortfolioItem[] | null = null;

  constructor() {
    this.ensureDataDir();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error("Failed to create data dir for smart features:", err);
      }
    }
  }

  public getConfig(): SmartFeaturesConfig {
    if (this.config) return this.config;
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        this.config = JSON.parse(raw);
        return this.config!;
      } catch (e) {
        console.error("Error reading smart features config file:", e);
      }
    }
    this.config = defaultSmartConfig;
    this.saveConfig(this.config);
    return this.config;
  }

  public saveConfig(updated: SmartFeaturesConfig): SmartFeaturesConfig {
    this.ensureDataDir();
    this.config = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), "utf-8");
    } catch (err) {
      console.error("Error saving smart features config:", err);
    }
    return this.config;
  }

  public getCompoundMasterplans(): CompoundMasterplan[] {
    return initialCompoundMasterplans;
  }

  public getAqarReels(): AqarReelsItem[] {
    return initialAqarReels;
  }

  public getMarketIndexTrends(): MarketIndexDistrictTrend[] {
    return initialMarketDistrictTrends;
  }

  public getReverseRequests(): ReversePropertyRequest[] {
    if (this.reverseRequests) return this.reverseRequests;
    if (fs.existsSync(REVERSE_REQUESTS_FILE)) {
      try {
        this.reverseRequests = JSON.parse(fs.readFileSync(REVERSE_REQUESTS_FILE, "utf-8"));
        return this.reverseRequests!;
      } catch (e) {
        console.error(e);
      }
    }
    this.reverseRequests = initialReverseRequests;
    this.saveReverseRequests(this.reverseRequests);
    return this.reverseRequests;
  }

  public saveReverseRequests(items: ReversePropertyRequest[]) {
    this.ensureDataDir();
    this.reverseRequests = items;
    fs.writeFileSync(REVERSE_REQUESTS_FILE, JSON.stringify(items, null, 2), "utf-8");
  }

  public addReverseRequest(req: Omit<ReversePropertyRequest, "id" | "createdAt" | "offersCount" | "status">): ReversePropertyRequest {
    const list = this.getReverseRequests();
    const created: ReversePropertyRequest = {
      ...req,
      id: `req-${Date.now()}`,
      status: "open",
      offersCount: 0,
      createdAt: new Date().toISOString(),
    };
    list.unshift(created);
    this.saveReverseRequests(list);
    return created;
  }

  public getInspections(): EngineeringInspectionBooking[] {
    if (this.inspections) return this.inspections;
    if (fs.existsSync(INSPECTIONS_FILE)) {
      try {
        this.inspections = JSON.parse(fs.readFileSync(INSPECTIONS_FILE, "utf-8"));
        return this.inspections!;
      } catch (e) {
        console.error(e);
      }
    }
    this.inspections = initialInspections;
    this.saveInspections(this.inspections);
    return this.inspections;
  }

  public saveInspections(items: EngineeringInspectionBooking[]) {
    this.ensureDataDir();
    this.inspections = items;
    fs.writeFileSync(INSPECTIONS_FILE, JSON.stringify(items, null, 2), "utf-8");
  }

  public bookInspection(booking: Omit<EngineeringInspectionBooking, "id" | "createdAt" | "status">): EngineeringInspectionBooking {
    const list = this.getInspections();
    const created: EngineeringInspectionBooking = {
      ...booking,
      id: `insp-${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    list.unshift(created);
    this.saveInspections(list);
    return created;
  }

  public getBrokerReviews(brokerId?: string): BrokerReview[] {
    if (!this.brokerReviews) {
      if (fs.existsSync(BROKER_REVIEWS_FILE)) {
        try {
          this.brokerReviews = JSON.parse(fs.readFileSync(BROKER_REVIEWS_FILE, "utf-8"));
        } catch (e) {
          console.error(e);
          this.brokerReviews = initialBrokerReviews;
        }
      } else {
        this.brokerReviews = initialBrokerReviews;
        this.saveBrokerReviews(this.brokerReviews);
      }
    }
    if (brokerId) {
      return this.brokerReviews!.filter((r) => r.brokerId === brokerId);
    }
    return this.brokerReviews!;
  }

  public saveBrokerReviews(reviews: BrokerReview[]) {
    this.ensureDataDir();
    this.brokerReviews = reviews;
    fs.writeFileSync(BROKER_REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf-8");
  }

  public addBrokerReview(review: Omit<BrokerReview, "id" | "createdAt">): BrokerReview {
    const list = this.getBrokerReviews();
    const created: BrokerReview = {
      ...review,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    list.unshift(created);
    this.saveBrokerReviews(list);
    return created;
  }

  public getPortfolioItems(userId: string): InvestorPortfolioItem[] {
    if (!this.portfolioItems) {
      if (fs.existsSync(PORTFOLIO_FILE)) {
        try {
          this.portfolioItems = JSON.parse(fs.readFileSync(PORTFOLIO_FILE, "utf-8"));
        } catch (e) {
          this.portfolioItems = [];
        }
      } else {
        this.portfolioItems = [
          {
            id: "port-1",
            userId: userId || "usr-investor-1",
            propertyTitle: "شقة استثمارية 165م كمبوند هايد بارك",
            purchasePrice: 4200000,
            currentMarketEstimate: 6850000,
            purchaseDate: "2023-03-15",
            rentalIncomeMonthly: 32000,
            tenantName: "شركة مقاولات أجنبية",
            occupancyStatus: "rented",
          },
          {
            id: "port-2",
            userId: userId || "usr-investor-1",
            propertyTitle: "عيادة طبية 60م مول إداري بالتسعين الشمالي",
            purchasePrice: 3100000,
            currentMarketEstimate: 4700000,
            purchaseDate: "2024-01-10",
            rentalIncomeMonthly: 0,
            nextInstallmentDueDate: "2026-11-01",
            nextInstallmentAmount: 145000,
            installmentsRemainingCount: 6,
            occupancyStatus: "under_finishing",
          },
        ];
        this.savePortfolioItems(this.portfolioItems);
      }
    }
    return this.portfolioItems!.filter((i) => i.userId === userId || !userId);
  }

  public savePortfolioItems(items: InvestorPortfolioItem[]) {
    this.ensureDataDir();
    this.portfolioItems = items;
    fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(items, null, 2), "utf-8");
  }

  public addPortfolioItem(item: Omit<InvestorPortfolioItem, "id">): InvestorPortfolioItem {
    const list = this.getPortfolioItems(item.userId);
    const created: InvestorPortfolioItem = {
      ...item,
      id: `port-${Date.now()}`,
    };
    list.unshift(created);
    this.savePortfolioItems(list);
    return created;
  }
}

export const smartFeaturesStore = new SmartFeaturesStore();

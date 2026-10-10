export interface SmartFeaturesConfig {
  version: string;
  updatedAt: string;
  updatedBy: string;

  // Master toggles for the 30 Smart Features
  features: {
    // Stage 1: Financial & Valuation Engine
    inflationHedgeCalculator: boolean;      // Idea 6
    resaleOverpriceSimulator: boolean;     // Idea 7
    fairPriceIndexTracker: boolean;        // Idea 8
    comprehensiveRoiYield: boolean;        // Idea 9
    shortTermRentalEstimator: boolean;     // Idea 10

    // Stage 2: Geospatial & Environmental
    commuteTimeIsochrone: boolean;         // Idea 1
    sunWindOrientationSimulator: boolean;  // Idea 2
    neighborhoodPoiHeatmaps: boolean;      // Idea 3
    infrastructureRadar: boolean;          // Idea 4
    neighborhoodComparisonRadar: boolean;  // Idea 5

    // Stage 3: Interactive UX & Engagement
    multiPropertyComparator: boolean;      // Idea 21
    oneClickBrochureWhatsApp: boolean;     // Idea 22
    expatDiasporaHub: boolean;             // Idea 23
    reversePropertyRequests: boolean;      // Idea 24
    silentPriceDropAlerts: boolean;        // Idea 25

    // Stage 4: Trust, Verification & Inspection
    verifiedOwnerBrokerBadges: boolean;    // Idea 16
    priceUndercuttingShield: boolean;      // Idea 17
    engineeringInspectionBooking: boolean; // Idea 18
    brokerReputationReviews: boolean;      // Idea 19
    maskedContactAntiSpam: boolean;        // Idea 20

    // Stage 5: AI & Immersive Experiences
    aiVirtualStagingStudio: boolean;       // Idea 11
    dynamicFinishingCostEstimator: boolean;// Idea 12
    aiListingGenerator: boolean;           // Idea 13
    egyptianDialectAiSearch: boolean;      // Idea 14
    legalContractRiskChecklist: boolean;   // Idea 15

    // Stage 6: Enterprise, Portfolios & Big Data
    aqarReelsVideoFeed: boolean;           // Idea 26
    interactiveCompoundMasterplans: boolean;// Idea 27
    mortgageBankingMatcher: boolean;       // Idea 28
    investorPortfolioTracker: boolean;     // Idea 29
    aqarPulseMarketIndex: boolean;         // Idea 30
  };

  // Customizable Parameters for Financial & Valuation Engine
  financialParams: {
    usdToEgpRate: number;
    sarToEgpRate: number;
    aedToEgpRate: number;
    kwdToEgpRate: number;
    goldGram24PriceEgp: number;
    annualInflationRatePercent: number;
    bankCertificateAnnualYieldPercent: number;
    realEstateDispositionTaxPercent: number; // 2.5% in Egypt
    averageAnnualAppreciationRatePercent: number;
  };

  // Customizable Parameters for Geospatial & Environmental
  geospatialParams: {
    commuteHubs: {
      id: string;
      nameAr: string;
      nameEn: string;
      lat: number;
      lng: number;
      category: "business_hub" | "airport" | "university" | "city_center";
    }[];
    infrastructureProjects: {
      id: string;
      nameAr: string;
      completionYear: number;
      impactRadiusKm: number;
      expectedValueBoostPercent: number;
      lat: number;
      lng: number;
    }[];
  };

  // Customizable Parameters for Finishing Costs (EGP / m²)
  finishingParams: {
    luxCostPerSqM: number;
    superLuxCostPerSqM: number;
    ultraLuxCostPerSqM: number;
    smartHomeAddonPerSqM: number;
    kitchenAndAcAddonPerSqM: number;
    estimatedFinishingMonths: number;
  };

  // Inspection Booking Settings
  inspectionParams: {
    baseInspectionFeeEgp: number;
    expressDeliveryFeeEgp: number;
    certifiedEngineersCount: number;
    sampleReportUrl?: string;
  };

  // Mortgage & Financing Parameters
  mortgageParams: {
    cbeLowIncomeRatePercent: number;       // 3% CBE Initiative
    cbeMiddleIncomeRatePercent: number;    // 8% CBE Initiative
    commercialMortgageRatePercent: number; // ~20-22% Market rate
    maxLoanTenureYears: number;            // Up to 30 years
    maxFinancingRatioPercent: number;      // 80%
  };
}

// Data models for interactive feature modules

export interface ReversePropertyRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  title: string;
  cityId: string;
  districtId: string;
  districtNameAr: string;
  category: string;
  transactionType: "sale" | "rent";
  minBudget: number;
  maxBudget: number;
  minArea: number;
  maxArea?: number;
  bedrooms?: number;
  notes?: string;
  urgency: "urgent" | "within_month" | "flexible";
  status: "open" | "fulfilled" | "cancelled";
  offersCount: number;
  createdAt: string;
}

export interface EngineeringInspectionBooking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail?: string;
  propertyAddress: string;
  preferredDate: string;
  inspectionType: "full_civil_electrical" | "finishing_only" | "structural_assessment";
  status: "pending" | "scheduled" | "inspecting" | "report_ready" | "cancelled";
  assignedEngineerName?: string;
  reportPdfUrl?: string;
  scoreOverall?: number; // 0 to 100
  notes?: string;
  createdAt: string;
}

export interface BrokerReview {
  id: string;
  brokerId: string;
  brokerName: string;
  reviewerName: string;
  ratingOverall: number; // 1 to 5
  ratingAccuracy: number;
  ratingCommunication: number;
  ratingPunctuality: number;
  comment: string;
  isVerifiedDeal: boolean;
  createdAt: string;
}

export interface CompoundMasterplan {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  developerNameAr: string;
  districtNameAr: string;
  lat: number;
  lng: number;
  totalAreaFeddan: number;
  deliveryYear: number;
  startingPrice: number;
  installmentYearsMax: number;
  downPaymentPercent: number;
  coverImage: string;
  masterplanMapUrl: string;
  descriptionAr: string;
  availableUnitsCount: number;
  amenities: string[];
}

export interface AqarReelsItem {
  id: string;
  propertyId: string;
  title: string;
  locationAr: string;
  price: number;
  videoUrl: string;
  thumbnailUrl: string;
  viewsCount: number;
  likesCount: number;
  advertiserName: string;
  advertiserRole: string;
  tags: string[];
}

export interface InvestorPortfolioItem {
  id: string;
  userId: string;
  propertyTitle: string;
  purchasePrice: number;
  currentMarketEstimate: number;
  purchaseDate: string;
  rentalIncomeMonthly: number;
  tenantName?: string;
  nextInstallmentDueDate?: string;
  nextInstallmentAmount?: number;
  installmentsRemainingCount?: number;
  occupancyStatus: "rented" | "vacant" | "under_finishing" | "for_resale";
}

export interface MarketIndexDistrictTrend {
  districtId: string;
  districtNameAr: string;
  avgPricePerSqM: number;
  yoyGrowthPercent: number;
  demandScore: number; // 1-100
  rentalYieldPercent: number;
  mostDemandedType: string;
}

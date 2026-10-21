export type RankingScope = "district_category" | "city_category" | "platform_wide";

export interface RatingsConfig {
  sellerRatingsEnabled: boolean;
  sellerBadgeEnabled: boolean;
  projectBadgeEnabled: boolean;
  sellerMinRating: number;
  sellerMinReviews: number;
  projectMinFavorites: number;
  projectWindowDays: number;
  rankingScope: RankingScope;
}

export const DEFAULT_RATINGS_CONFIG: RatingsConfig = {
  sellerRatingsEnabled: true,
  sellerBadgeEnabled: true,
  projectBadgeEnabled: true,
  sellerMinRating: 4.5,
  sellerMinReviews: 5,
  projectMinFavorites: 10,
  projectWindowDays: 30,
  rankingScope: "district_category",
};

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function mapRatingsConfig(row: Record<string, unknown> | null): RatingsConfig {
  if (!row) return DEFAULT_RATINGS_CONFIG;

  const scope = row.ranking_scope;
  return {
    sellerRatingsEnabled: row.seller_ratings_enabled === true,
    sellerBadgeEnabled: row.seller_badge_enabled === true,
    projectBadgeEnabled: row.project_badge_enabled === true,
    sellerMinRating: Number(row.seller_min_rating),
    sellerMinReviews: Number(row.seller_min_reviews),
    projectMinFavorites: Number(row.project_min_favorites),
    projectWindowDays: Number(row.project_window_days),
    rankingScope:
      scope === "city_category" || scope === "platform_wide"
        ? scope
        : "district_category",
  };
}

export async function fetchAllRows<T>(
  makePage: (start: number, end: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await makePage(start, start + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export function getRatingGroupKey(
  sellerId: string,
  cityId: string | null,
  districtId: string | null,
  category: string | null,
  scope: RankingScope
): string {
  if (scope === "platform_wide") return sellerId;
  if (scope === "city_category") return `${sellerId}:${cityId ?? ""}:${category ?? ""}`;
  return `${sellerId}:${districtId ?? ""}:${category ?? ""}`;
}

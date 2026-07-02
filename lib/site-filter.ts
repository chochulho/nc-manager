/**
 * 사업장(site)별 데이터 접근 제어 헬퍼
 *
 * allowedSiteIds 의미:
 *  - null      → org ADMIN or isAdmin → 필터 없음 (전체 조회)
 *  - []        → 사업장 미배정 → 데이터 전체 차단
 *  - [id, ...] → 해당 사업장만 조회
 *
 * siteId 가 null 인 레코드 처리:
 *  - 사업장이 지정되지 않은 레코드는 모든 사용자에게 표시 (공용 데이터 취급)
 *  - 이는 기존 데이터(siteId 미설정)와의 하위 호환을 위함
 */

import { SQL, inArray, isNull, or, sql, eq } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import { cookies } from "next/headers";

/**
 * 현재 사용자가 선택한 사업장 ID를 쿠키에서 읽는다.
 * 서버 컴포넌트 / API Route 에서만 호출 가능.
 */
export async function getSelectedSiteId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("nc-selected-site")?.value ?? null;
}

/**
 * Drizzle WHERE 조건을 생성한다.
 *
 * @param allowedSiteIds  세션의 allowedSiteIds 값
 * @param siteIdColumn    테이블의 site_id 컬럼 (e.g. internalNCs.occurrenceSiteId)
 * @param selectedSiteId  사용자가 선택한 사업장 ID (사이드바 스위처에서 설정)
 * @returns SQL 조건 또는 undefined (조건 없음)
 */
export function buildSiteFilter(
  allowedSiteIds: string[] | null,
  siteIdColumn: AnyColumn,
  selectedSiteId?: string | null,
): SQL | undefined {
  // 관리자가 특정 사업장 선택 → 해당 사업장만
  if (allowedSiteIds === null && selectedSiteId) {
    return or(eq(siteIdColumn, selectedSiteId), isNull(siteIdColumn)) as SQL;
  }
  // 관리자 미선택 → 전체 조회
  if (allowedSiteIds === null) return undefined;

  // 사업장 미배정 → 전체 차단
  if (allowedSiteIds.length === 0) return sql`false`;

  // 일반 멤버가 특정 사업장 선택 (허용 목록 안에 있을 때만)
  if (selectedSiteId && allowedSiteIds.includes(selectedSiteId)) {
    return or(eq(siteIdColumn, selectedSiteId), isNull(siteIdColumn)) as SQL;
  }

  // 허용된 site 이거나 siteId 가 null 인 레코드 (하위 호환)
  return or(
    inArray(siteIdColumn, allowedSiteIds),
    isNull(siteIdColumn),
  ) as SQL;
}

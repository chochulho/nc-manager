import { db } from "@/lib/db";
import { ncCategoriesL2 } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { Tag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function CategoriesPage() {
  const categories = await db
    .select()
    .from(ncCategoriesL2)
    .where(isNull(ncCategoriesL2.orgId))
    .orderBy(ncCategoriesL2.sortOrder);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/masters"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="page-title">분류체계 (NC Category)</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-muted-foreground">시스템 기본 분류 (IATF 16949 기반) — 조직별 커스텀 분류는 추후 지원 예정</p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">코드</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">한국어</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">English</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">구분</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((cat, i) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 font-mono text-xs font-medium">
                    <Tag className="h-3 w-3" />{cat.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{cat.nameKo}</td>
                <td className="px-4 py-3 text-gray-500">{cat.nameEn}</td>
                <td className="px-4 py-3 text-center">
                  {cat.isSystem && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">시스템</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

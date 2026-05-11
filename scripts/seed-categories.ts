import { db } from "../lib/db";
import { ncCategoriesL2 } from "../lib/db/schema";
import { count } from "drizzle-orm";

const SYSTEM_CATEGORIES_L2 = [
  { code: "DIM", nameKo: "치수 (Dimensional)", nameEn: "Dimensional", sortOrder: 1 },
  { code: "APP", nameKo: "외관 (Appearance)", nameEn: "Appearance", sortOrder: 2 },
  { code: "FUNC", nameKo: "기능 (Functional)", nameEn: "Functional", sortOrder: 3 },
  { code: "MAT", nameKo: "재질 (Material)", nameEn: "Material", sortOrder: 4 },
  { code: "PKG", nameKo: "포장/라벨 (Packaging)", nameEn: "Packaging/Labeling", sortOrder: 5 },
  { code: "DOC", nameKo: "서류/COC (Documentation)", nameEn: "Documentation", sortOrder: 6 },
  { code: "ETC", nameKo: "기타 (Other)", nameEn: "Other", sortOrder: 7 },
];

async function main() {
  const [existing] = await db.select({ c: count() }).from(ncCategoriesL2);
  if (existing.c > 0) {
    console.log(`Already seeded: ${existing.c} categories`);
    process.exit(0);
  }

  const created = await db
    .insert(ncCategoriesL2)
    .values(SYSTEM_CATEGORIES_L2.map((c) => ({ ...c, isSystem: true })))
    .returning({ id: ncCategoriesL2.id, code: ncCategoriesL2.code });

  console.log(`Seeded ${created.length} categories:`);
  created.forEach((c) => console.log(`  ${c.code} (${c.id})`));
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

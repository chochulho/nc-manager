/**
 * DB 초기화 스크립트
 * 기존 테이블 전체 DROP → 새 스키마(FK 없는 버전)로 재생성
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as drizzleSql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client);

async function main() {
  console.log("🗑️  public 스키마 전체 초기화 중...");

  // public 스키마 DROP 후 재생성 → 모든 테이블/시퀀스/타입 제거
  await db.execute(drizzleSql.raw(`DROP SCHEMA public CASCADE`));
  await db.execute(drizzleSql.raw(`CREATE SCHEMA public`));
  await db.execute(drizzleSql.raw(`GRANT ALL ON SCHEMA public TO public`));

  console.log("✅ 스키마 초기화 완료");

  // 마이그레이션 SQL 읽기
  const migrationDir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("❌ 마이그레이션 파일 없음. npx drizzle-kit generate 먼저 실행하세요.");
    process.exit(1);
  }

  const latestMigration = files[files.length - 1];
  console.log(`\n📄 마이그레이션 적용: ${latestMigration}`);

  const migrationSql = fs.readFileSync(
    path.join(migrationDir, latestMigration),
    "utf-8"
  );

  // --> statement-breakpoint 로 분리하여 순차 실행
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    process.stdout.write(`\r  [${i + 1}/${statements.length}] 적용 중...`);
    await db.execute(drizzleSql.raw(statements[i]));
  }

  console.log(`\n✅ ${statements.length}개 구문 적용 완료`);
  console.log("\n🎉 DB 초기화 완료! 새 스키마로 재생성되었습니다.");
}

main().catch((err) => {
  console.error("\n❌ 오류:", err.message, err.cause ?? "");
  process.exit(1);
});

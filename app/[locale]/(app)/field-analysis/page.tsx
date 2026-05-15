import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { parsePeriodParams } from "@/lib/period-utils";
import { FieldAnalysisClient } from "./field-analysis-client";

export default async function FieldAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const sp = await searchParams;
  const { year, period } = parsePeriodParams(sp.year, sp.period);

  return <FieldAnalysisClient year={year} period={period} />;
}

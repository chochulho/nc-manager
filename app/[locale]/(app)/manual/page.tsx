import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/nc/print-button";
import { ManualContent, manualSections } from "./manual-content";

export default async function ManualPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">사용 매뉴얼</h1>
          <p className="text-sm text-muted-foreground">NC Manager 기능별 사용 방법 안내</p>
        </div>
        <PrintButton />
      </div>
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">NC Manager 사용 매뉴얼</h1>
      </div>

      <div className="flex gap-8 items-start">
        <nav className="hidden lg:block w-56 shrink-0 sticky top-6 print:hidden">
          <ul className="space-y-0.5 text-sm">
            {manualSections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex-1 min-w-0 max-w-3xl">
          <ManualContent />
        </div>
      </div>
    </div>
  );
}

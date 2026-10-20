import { Suspense } from "react";
import { TraderProfile } from "@/components/trader-profile";

function TraderPageSkeleton() {
  return (
    <main aria-hidden="true">
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
          <div className="h-3 w-28 animate-pulse bg-line" />
          <div className="mt-8 flex items-center gap-5">
            <div className="h-16 w-16 animate-pulse bg-line" />
            <div>
              <div className="h-12 w-72 animate-pulse bg-line" />
              <div className="mt-4 h-3 w-48 animate-pulse bg-line" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-surface p-5 sm:p-6">
              <div className="h-3 w-24 animate-pulse bg-line" />
              <div className="mt-4 h-9 w-20 animate-pulse bg-line" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

async function TraderPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TraderProfile id={id} />;
}

export default function TraderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<TraderPageSkeleton />}>
      <TraderPageContent params={params} />
    </Suspense>
  );
}

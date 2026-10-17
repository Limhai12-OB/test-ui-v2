/** Frame 05.4 "Dashboard — Loading": card outlines with pulsing placeholder bars. */
export function DashboardSkeleton() {
  const card = "rounded-lg border border-line bg-surface p-4 shadow-xs";
  return (
    <div className="flex flex-col gap-4 md:gap-6" aria-hidden>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4 xl:gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${card} flex flex-col gap-4 md:h-[102px]`}>
            <div className="flex justify-between">
              <span className="skeleton h-2.5 w-[45%]" />
              <span className="skeleton size-6" />
            </div>
            <span className="skeleton h-6 w-[60%]" />
            <span className="skeleton h-2 w-[42%]" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className={`${card} flex h-[270px] flex-col gap-3`}>
          <span className="skeleton h-2.5 w-[25%]" />
          <span className="skeleton h-2 w-[36%]" />
          <span className="skeleton mt-2 flex-1" />
        </div>
        <div className={`${card} flex h-[270px] flex-col gap-3`}>
          <span className="skeleton h-2.5 w-[55%]" />
          <span className="skeleton h-2 w-[80%]" />
          <span className="skeleton mt-2 flex-1" />
        </div>
      </div>
      <div className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {[0, 1].map((i) => (
              <div key={i} className={`${card} flex h-[142px] flex-col gap-3`}>
                <span className="skeleton h-2.5 w-[50%]" />
                <span className="skeleton h-2 w-[72%]" />
                <span className="skeleton mt-2 flex-1" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-line bg-surface shadow-xs">
            <div className="border-b border-line p-4">
              <span className="skeleton block h-2.5 w-[22%]" />
            </div>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-[6%] border-b border-line-subtle px-3 py-4 last:border-b-0">
                <span className="skeleton h-2 w-[6%]" />
                <span className="skeleton h-2 w-[30%]" />
                <span className="skeleton h-2 w-[13%]" />
                <span className="skeleton ml-auto h-2 w-[10%]" />
              </div>
            ))}
          </div>
        </div>
        <div className={`${card} hidden flex-col gap-3 xl:flex`}>
          <span className="skeleton h-2.5 w-[55%]" />
          <span className="skeleton h-2 w-[80%]" />
          <span className="skeleton mt-2 flex-1" />
        </div>
      </div>
    </div>
  );
}

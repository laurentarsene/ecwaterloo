import svgPaths from "../../imports/Complete/svg-ykebcqg7yi";

export function Logo({ className = "h-16", dark = false }: { className?: string; dark?: boolean }) {
  const textColor = dark ? "text-white" : "text-[#1c3038]";
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative h-full aspect-square shrink-0">
        <svg className="h-full w-full" fill="none" viewBox="0 0 330 340">
          <path d={svgPaths.p6d98480} fill="#FF7171" />
          <path d={svgPaths.p1762da00} fill="#59A2B4" />
          <path d={svgPaths.p2bd1da80} fill="#C9C918" />
          <path d={svgPaths.p2d9bc800} fill="#1C3038" />
          <path d={svgPaths.p280bf980} fill="#FF7171" />
        </svg>
      </div>
      <div className={`flex flex-col leading-tight font-['Comfortaa',sans-serif] ${textColor}`}>
        <span>
          <span className="text-[#d96363]">E</span>space
        </span>
        <span>
          <span className="text-[#a5a547]">C</span>onvivial
        </span>
        <span className="text-[0.5em]">
          de <span className="text-[#59a2b4]">W</span>aterloo
        </span>
      </div>
    </div>
  );
}

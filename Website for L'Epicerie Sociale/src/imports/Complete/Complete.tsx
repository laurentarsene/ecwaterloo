import svgPaths from "./svg-ykebcqg7yi";

function Layer() {
  return (
    <div className="absolute inset-[0_62.09%_0_0]" data-name="Layer 2">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 326.93 334.521">
        <g id="Layer 2">
          <path d={svgPaths.p6d98480} fill="var(--fill-0, #FF7171)" id="Vector" />
          <path d={svgPaths.p1762da00} fill="var(--fill-0, #59A2B4)" id="Vector_2" />
          <path d={svgPaths.p2bd1da80} fill="var(--fill-0, #C9C918)" id="Vector_3" />
          <path d={svgPaths.p2d9bc800} fill="var(--fill-0, #1C3038)" id="Vector_4" />
          <path d={svgPaths.p280bf980} fill="var(--fill-0, #FF7171)" id="Vector_5" />
        </g>
      </svg>
    </div>
  );
}

export default function Complete() {
  return (
    <div className="relative size-full" data-name="complete">
      <Layer />
      <div className="absolute font-['Comfortaa:Bold',sans-serif] font-bold inset-[24.21%_0_11.81%_43.99%] leading-[0] text-[#1c3038] text-[96px] whitespace-nowrap">
        <p className="mb-0 whitespace-pre">
          <span className="leading-[normal] text-[#d96363]">E</span>
          <span className="leading-[normal]">space</span>
        </p>
        <p className="whitespace-pre">
          <span className="leading-[normal] text-[#c9c918]">{` `}</span>
          <span className="leading-[normal] text-[#a5a547]">C</span>
          <span className="leading-[normal]">onvivial</span>
        </p>
      </div>
      <p className="absolute font-['Comfortaa:Regular',sans-serif] font-normal leading-[0] left-[713.3px] text-[#1c3038] text-[0px] top-[292px] whitespace-nowrap">
        <span className="leading-[normal] text-[24px]">{`de `}</span>
        <span className="leading-[normal] text-[#59a2b4] text-[24px]">W</span>
        <span className="leading-[normal] text-[24px]">aterloo</span>
      </p>
    </div>
  );
}
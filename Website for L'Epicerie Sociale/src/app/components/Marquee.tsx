import { motion } from "motion/react";

interface MarqueeProps {
  items: string[];
  speed?: number;
  className?: string;
  separator?: string;
}

export function Marquee({ items, speed = 30, className = "", separator = "+" }: MarqueeProps) {
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div
        className="inline-flex items-center gap-10"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {repeated.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-10">
            <span>{item}</span>
            <span className="opacity-30">{separator}</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

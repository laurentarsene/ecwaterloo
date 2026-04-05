import { motion } from "motion/react";
import { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}

export function Reveal({ children, className = "", delay = 0, direction = "up" }: RevealProps) {
  const initial = {
    opacity: 0,
    y: direction === "up" ? 50 : 0,
    x: direction === "left" ? -50 : direction === "right" ? 50 : 0,
  };

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

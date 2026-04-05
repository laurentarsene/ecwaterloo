import { motion } from "motion/react";

interface BlobProps {
  color: string;
  className?: string;
  size?: number;
  delay?: number;
}

export function Blob({ color, className = "", size = 400, delay = 0 }: BlobProps) {
  return (
    <motion.div
      className={`absolute rounded-full blur-[100px] opacity-20 pointer-events-none ${className}`}
      style={{ width: size, height: size, background: color }}
      animate={{
        scale: [1, 1.1, 1],
        x: [0, 15, -10, 0],
        y: [0, -10, 8, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

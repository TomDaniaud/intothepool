"use client";

import { motion } from "framer-motion";

/**
 * Couleurs associées à chaque level de compétition.
 */
const LEVEL_COLORS = {
  NATIONAL: {
    from: "var(--color-cyan-600)",
    to: "var(--color-blue-400)",
  },
  REGIONAL: {
    from: "var(--color-amber-600)",
    to: "var(--color-amber-400)",
  },
  DEPARTEMENTAL: {
    from: "var(--color-emerald-600)",
    to: "var(--color-emerald-400)",
  },
  INTERNATIONAL: {
    from: "var(--color-purple-600)",
    to: "var(--color-purple-400)",
  },
};

/**
 * Arrière-plan animé avec dégradé coloré selon le level,
 * démarcation en dent de scie (une seule période) et animation de montée.
 * Ne couvre pas la sidebar (commence à 20% sur desktop).
 *
 * @param {{ level?: string }} props
 */
export function CompetitionBackground({ level }) {
  const colors = LEVEL_COLORS[level] || LEVEL_COLORS.DEPARTEMENTAL;
  // 1 période sur la démarcation à mi-hauteur:
  // gauche (50%) → creux (plus bas) → bosse (plus haut) → droite (50%)
  // Puis on ferme jusqu'en bas pour remplir toute la moitié basse.
  // const boundaryPath = "M 0 50 L 50 68 L 75 32 L 100 50 L 100 100 L 0 100 Z";
  const boundaryPath = "M 0 20 L 33 50 L 66 20 L 100 50 L 100 100 L 0 100 Z";

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{
        type: "spring",
        stiffness: 50,
        damping: 20,
        duration: 1.8,
      }}
    >
      {/* Zone colorée: moitié basse + démarcation 1 période */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="competition-bg" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>
        <path d={boundaryPath} fill="url(#competition-bg)" />
      </svg>
    </motion.div>
  );
}

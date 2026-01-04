"use client";
import { motion } from "framer-motion";

/**
 * Couleurs associées à chaque level de compétition.
 */
const LEVEL_COLORS = {
  NATIONAL: "var(--color-red-400)",
  REGIONAL:  "var(--color-purple-400)",
  DEPARTEMENTAL: "var(--color-emerald-400)",
  INTERNATIONAL: "var(--color-amber-400)",
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
  return (
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 2, opacity: 0.5 }}
        transition={{ duration: 3.2, delay: 0.2, type: "spring", stiffness: 40 }}
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          // transform: "translateX(-50%)",
          width: "80vw",
          height: "40vh",
          pointerEvents: "none",
          zIndex: 1,
        }}
        aria-hidden="true"
      >
        {/* <div
          style={{
            width: "80%",
            height: "80%",
            background: `radial-gradient(ellipse at bottom center, ${colors} 0%, transparent 70%)`,
            opacity: 1,
          }}
        /> */}
      </motion.div>
  );
}

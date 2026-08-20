import { motion } from "framer-motion";

export default function EventLoopCircle({ currentAction }) {
  let color = "#64748b"; // gray
  let glow = "0 0 0 rgba(0,0,0,0)";

  if (currentAction.includes("microtask")) {
    color = "#a855f7"; // purple
    glow = "0 0 25px rgba(168,85,247,0.6)";
  } else if (currentAction.includes("macrotask")) {
    color = "#f59e0b"; // orange
    glow = "0 0 25px rgba(245,158,11,0.6)";
  } else if (
    currentAction.includes("Executing") ||
    currentAction.includes("synchronous")
  ) {
    color = "#22c55e"; // green
    glow = "0 0 25px rgba(34,197,94,0.6)";
  }

  return (
    <div className="bg-[#111216]/90 backdrop-blur-xl rounded-3xl p-6 border border-white/5 flex items-center justify-center min-h-[380px] shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex items-center justify-center"
      >
        <div
          className="w-48 h-48 rounded-full border-4 flex items-center justify-center text-center font-black text-xs tracking-[0.2em] transition-all duration-300"
          style={{
            borderColor: color,
            color,
            boxShadow: glow,
          }}
        >
          EVENT LOOP
        </div>

        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute w-56 h-56 rounded-full border border-dashed opacity-40"
          style={{ borderColor: color }}
        />
      </motion.div>
    </div>
  );
}

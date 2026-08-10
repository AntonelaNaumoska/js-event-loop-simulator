import { useRef, useState } from "react";
import { motion } from "framer-motion";
import CodeEditor from "./components/CodeEditor";
import EventLoopCircle from "./components/EventLoopCircle";
import { parseCode } from "./engine/parser";
import { runSimulation, createSimulation } from "./engine/simulator";

const initialCode = `console.log('Start');

Promise.resolve().then(() => {
  console.log('Promise');
});

setTimeout(() => {
  console.log('Timeout');
}, 0);

console.log('End');`;

export default function App() {
  const [code, setCode] = useState(initialCode);

  const [state, setState] = useState({
    callStack: [],
    webApis: [],
    microtasks: [],
    macrotasks: [],
    output: [],
  });

  const [speed, setSpeed] = useState(800);

  const stopRef = useRef(false);

  const [currentAction, setCurrentAction] = useState("Idle");
  const [stepCount, setStepCount] = useState(0);

  // Dynamic simulation used by Next Step
  const [stepSimulation, setStepSimulation] = useState(null);

  // ==========================================
  // RUN - AUTOMATIC SIMULATION
  // ==========================================

  const handleRun = async () => {
    stopRef.current = false;

    // Start a fresh automatic simulation
    setStepSimulation(null);

    setCurrentAction("Starting simulation");
    setStepCount(0);

    setState({
      callStack: [],
      webApis: [],
      microtasks: [],
      macrotasks: [],
      output: [],
    });
    // Parse whatever code the user currently has in the editor
    const instructions = parseCode(code);

    await runSimulation(
      instructions,

      (newState) => {
        setStepCount((prev) => prev + 1);

        setState(newState);

        if (newState.callStack.includes("promise callback")) {
          setCurrentAction("Running microtask callback");
        } else if (newState.callStack.includes("timeout callback")) {
          setCurrentAction("Running macrotask callback");
        } else if (newState.callStack.length > 0) {
          setCurrentAction("Executing synchronous code");
        } else if (newState.microtasks.length > 0) {
          setCurrentAction("Promise scheduled in Microtask Queue");
        } else if (newState.macrotasks.length > 0) {
          setCurrentAction("setTimeout scheduled in Macrotask Queue");
        } else {
          setCurrentAction("Idle");
        }
      },

      speed,

      () => stopRef.current,
    );

    if (!stopRef.current) {
      setCurrentAction("Simulation completed");
    }
  };

  // ==========================================
  // NEXT STEP - DYNAMIC SIMULATION
  // ==========================================

  const handleNextStep = () => {
    let simulation = stepSimulation;

    // First click: create simulation
    if (!simulation) {
      const instructions = parseCode(code);
      simulation = createSimulation(instructions);
      setStepSimulation(simulation);
    }

    const result = simulation.step();

    setState(result.state);
    setCurrentAction(result.action);

    if (result.finished) {
      setStepSimulation(null);
      return;
    }

    setStepCount((prev) => prev + 1);
  };
  // ==========================================
  // RESET
  // ==========================================

  const handleReset = () => {
    stopRef.current = true;

    setStepSimulation(null);

    setCurrentAction("Idle");

    setStepCount(0);

    setState({
      callStack: [],
      webApis: [],
      microtasks: [],
      macrotasks: [],
      output: [],
    });
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0c] via-[#111215] to-[#1a1208] text-white p-6">
      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 bg-[#141518]/80 backdrop-blur-xl border border-amber-500/10 rounded-3xl px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        {/* TITLE */}
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
            Event Loop Simulator
          </h1>
          <p className="text-slate-400 mt-1 text-sm tracking-wide">
            Interactive JavaScript Runtime Simulator
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-4">
          {/* SPEED */}
          <div className="flex items-center gap-2 text-sm">
            <span>Speed</span>

            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-orange-500"
            />

            <span>{speed}ms</span>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-2">
            {/* RUN */}
            <button
              onClick={handleRun}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all duration-200"
            >
              Run
            </button>

            {/* NEXT STEP */}
            <button
              onClick={handleNextStep}
              className="bg-[#1f1a12] hover:bg-[#2a2115] border border-amber-500/20 text-amber-300 px-5 py-2.5 rounded-xl transition-all duration-200"
            >
              Next Step
            </button>

            {/* RESET */}
            <button
              onClick={handleReset}
              className="bg-[#1f1a12] hover:bg-[#2a2115] border border-amber-500/20 text-amber-300 px-5 py-2.5 rounded-xl transition-all duration-200"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex gap-4 items-start">
        {/* LEFT SIDE - CODE EDITOR */}
        <div className="w-[48%] bg-gradient-to-br from-[#0b0b0c] via-[#111215] to-[#1a1208]  top-4">
          <h2 className="font-semibold mb-2">Input Script</h2>

          <CodeEditor code={code} setCode={setCode} />
        </div>

        {/* RIGHT SIDE */}
        <div className="w-[52%] flex flex-col gap-4">
          {/* TOP PANELS */}
          <div className="grid grid-cols-2 gap-4">
            {/* CALL STACK */}
            <Panel title="Call Stack" items={state.callStack} />

            {/* WEB APIS */}
            <Panel title="Web APIs" items={state.webApis} />

            {/* EVENT LOOP */}
            <EventLoopCircle currentAction={currentAction} />

            {/* QUEUES */}
            <div className="flex flex-col gap-4">
              <Panel title="Microtask Queue" items={state.microtasks} />

              <Panel title="Macrotask Queue" items={state.macrotasks} />
            </div>
          </div>

          {/* CURRENT ACTION */}
          <div className="bg-[#16171b]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  currentAction === "Idle"
                    ? "bg-slate-400"
                    : currentAction === "Simulation completed"
                      ? "bg-blue-400"
                      : currentAction.includes("scheduled")
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-green-400 animate-pulse"
                }`}
              />

              <h2 className="font-semibold">Current Action</h2>
            </div>

            <p className="text-slate-300 mt-2 text-sm">{currentAction}</p>
          </div>

          {/* SIMULATION STEPS */}
          <div className="bg-[#16171b]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Simulation Steps</h2>

              <span className="text-3xl font-black text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                {stepCount}
              </span>
            </div>

            <p className="text-slate-400 text-sm mt-2">
              Number of visualization updates executed.
            </p>
          </div>

          {/* OUTPUT */}
          <div className="bg-[#16171b]/80 backdrop-blur-xl rounded-3xl p-4 border border-white/5 min-h-[160px] shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <h2 className="font-semibold mb-2">Actual Output</h2>

            <div className="font-mono text-sm flex flex-col gap-1">
              {state.output.length === 0 ? (
                <p className="text-slate-400">Run code to see output...</p>
              ) : (
                state.output.map((line, index) => (
                  <motion.div
                    key={index}
                    initial={{
                      opacity: 0,
                      x: -10,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                  >
                    {line}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PANEL COMPONENT
// ==========================================

function Panel({ title, items = [] }) {
  return (
    <div className="bg-[#16171b]/80 backdrop-blur-xl rounded-3xl p-4 border border-white/5 min-h-[240px] shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      <h3 className="font-semibold mb-3 text-amber-200 tracking-wide">
        {title}
      </h3>

      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="text-slate-500 text-sm">Empty</div>
        ) : (
          items.map((item, index) => (
            <motion.div
              key={index}
              initial={{
                opacity: 0,
                y: -10,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              transition={{
                duration: 0.25,
              }}
              className="bg-[#232428] rounded-xl px-3 py-2 text-sm font-mono border border-white/5 shadow-lg shadow-black/30 text-amber-100"
            >
              {item}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

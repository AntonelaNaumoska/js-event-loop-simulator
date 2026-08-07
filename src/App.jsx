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
    // First click:
    // Create a simulation from the user's actual code.
    if (!stepSimulation) {
      const instructions = parseCode(code);

      const simulation = createSimulation(instructions);

      setStepSimulation(simulation);

      const result = simulation.step();

      setState(result.state);
      setCurrentAction(result.action);
      setStepCount((prev) => prev + 1);

      return;
    }

    // Following clicks:
    // Continue the same simulation.
    const result = stepSimulation.step();

    setState(result.state);
    setCurrentAction(result.action);
    setStepCount((prev) => prev + 1);

    if (result.finished) {
      setStepSimulation(null);
    }
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
      microtasks: [],
      macrotasks: [],
      output: [],
    });
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        {/* TITLE */}
        <div>
          <h1 className="text-3xl font-bold">Event Loop Visualizer</h1>

          <p className="text-slate-400">JS Runtime Simulation</p>
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
            />

            <span>{speed}ms</span>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-2">
            {/* RUN */}
            <button
              onClick={handleRun}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg"
            >
              Run
            </button>

            {/* NEXT STEP */}
            <button
              onClick={handleNextStep}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg"
            >
              Next Step
            </button>

            {/* RESET */}
            <button
              onClick={handleReset}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex gap-4 items-start">
        {/* LEFT SIDE - CODE EDITOR */}
        <div className="w-[48%] bg-slate-800 rounded-2xl p-4 border border-slate-700 sticky top-4">
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
            <Panel title="Web APIs" items={[]} />

            {/* EVENT LOOP */}
            <EventLoopCircle />

            {/* QUEUES */}
            <div className="flex flex-col gap-4">
              <Panel title="Microtask Queue" items={state.microtasks} />

              <Panel title="Macrotask Queue" items={state.macrotasks} />
            </div>
          </div>

          {/* CURRENT ACTION */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
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
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Simulation Steps</h2>

              <span className="text-2xl font-bold text-blue-400">
                {stepCount}
              </span>
            </div>

            <p className="text-slate-400 text-sm mt-2">
              Number of visualization updates executed.
            </p>
          </div>

          {/* OUTPUT */}
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 min-h-[140px]">
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
    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 min-h-[240px]">
      <h3 className="font-semibold mb-2">{title}</h3>

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
              className="bg-slate-700 rounded-lg px-3 py-2 text-sm font-mono border border-slate-600 shadow-lg shadow-blue-500/10"
            >
              {item}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

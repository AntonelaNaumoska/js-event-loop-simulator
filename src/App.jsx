import { useRef, useState } from "react";
import { motion } from "framer-motion";
import CodeEditor from "./components/CodeEditor";
import EventLoopCircle from "./components/EventLoopCircle";
import { parseCode } from "./engine/parser";
import { runSimulation, createSimulation } from "./engine/simulator12";

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
    currentTime: 0,
  });

  const [speed, setSpeed] = useState(1000);
  const stopRef = useRef(false);

  const [currentAction, setCurrentAction] = useState("Idle");
  const [stepCount, setStepCount] = useState(0);
  const [stepSimulation, setStepSimulation] = useState(null);

  const handleRun = async () => {
    stopRef.current = false;

    setCurrentAction("Starting simulation");
    setStepCount(0);

    setState({
      callStack: [],
      webApis: [],
      microtasks: [],
      macrotasks: [],
      output: [],
      currentTime: 0,
    });

    const instructions = parseCode(code);

    await runSimulation(
      instructions,
      (newState, action) => {
        setStepCount((prev) => prev + 1);
        setState(newState);
        setCurrentAction(action);
      },
      speed,
      () => stopRef.current,
    );

    if (!stopRef.current) {
      setCurrentAction("Simulation completed");
    }
  };

  const handleNextStep = () => {
    if (!stepSimulation) {
      const instructions = parseCode(code);
      const simulation = createSimulation(instructions);

      setStepSimulation(simulation);

      const result = stepSimulation.step();

      setState(result.state);
      setCurrentAction(result.action);
      setStepCount((prev) => prev + 1);

      if (result.finished) {
        setStepSimulation(null);
      }

      return;
    }

    const result = stepSimulation.step();

    setState(result.state);
    setCurrentAction(result.action);
    setStepCount((prev) => prev + 1);

    if (result.finished) {
      setStepSimulation(null);
    }
  };

  const handleReset = () => {
    stopRef.current = true;

    setCurrentAction("Idle");
    setStepCount(0);
    setStepSimulation(null);

    setState({
      callStack: [],
      webApis: [],
      microtasks: [],
      macrotasks: [],
      output: [],
      currentTime: 0,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0c] via-[#111215] to-[#1a1208] text-white p-8 lg:p-10">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-amber-500/10 blur-3xl" />
      </div>

      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 bg-[#141518]/80 backdrop-blur-xl border border-amber-500/10 rounded-3xl px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
            Event Loop Simulator
          </h1>
          <p className="text-slate-400 mt-1 text-sm tracking-wide">
            Interactive JavaScript Runtime Simulator
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span>Speed</span>

            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-amber-400"
            />

            <span>{speed}ms</span>
          </div>

          <button
            onClick={handleRun}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all duration-200"
          >
            Run
          </button>

          <button
            onClick={handleNextStep}
            className="bg-[#1f1a12] hover:bg-[#2a2115] border border-amber-500/20 text-amber-300 px-5 py-2.5 rounded-xl transition-all duration-200"
          >
            Next Step
          </button>

          <button
            onClick={handleReset}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-5 py-2.5 rounded-xl transition-all duration-200"
          >
            Reset
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
        {/* LEFT SIDE */}
        <div className="flex flex-col gap-4 sticky top-4">
          {/* CODE EDITOR */}
          <div className="bg-[#0f1013]/95 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
            <h2 className="font-semibold mb-3 text-amber-200 tracking-wide">
              Input Script
            </h2>

            <CodeEditor code={code} setCode={setCode} />
          </div>

          {/* CURRENT ACTION */}
          <div className="bg-[#111216]/90 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
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

              <h2 className="font-semibold text-amber-200">Current Action</h2>
            </div>

            <p className="text-slate-300 mt-2 text-sm">{currentAction}</p>
          </div>

          {/* SIMULATION STEPS */}
          <div className="bg-[#111216]/90 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-amber-200">Simulation Steps</h2>

              <span className="text-3xl font-black text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                {stepCount}
              </span>
            </div>

            <p className="text-slate-400 text-sm mt-2">
              Number of visualization updates executed.
            </p>
          </div>

          {/* OUTPUT */}
          <div className="bg-[#111216]/90 backdrop-blur-xl rounded-3xl p-4 border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <h2 className="font-semibold mb-3 text-amber-200 tracking-wide">
              Actual Output
            </h2>

            <div className="font-mono text-sm flex flex-col gap-1 bg-black/40 rounded-2xl p-3 border border-white/5 min-h-[120px]">
              {state.output.length === 0 ? (
                <p className="text-slate-400">Run code to see output...</p>
              ) : (
                state.output.map((line, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-amber-100"
                  >
                    {line}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex flex-col gap-5">
          {/* SIMULATED CLOCK */}
          <div className="bg-[#16171b]/80 backdrop-blur-xl rounded-3xl px-5 py-4 border border-amber-500/10">
            <div className="text-xs uppercase tracking-widest text-slate-500">
              Simulated Time
            </div>

            <div className="text-3xl font-black text-amber-400 mt-1">
              {state.currentTime}ms
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Panel title="Call Stack" items={state.callStack} />

            <Panel
              title="Web APIs"
              items={state.webApis}
              currentTime={state.currentTime}
            />
          </div>

          <EventLoopCircle currentAction={currentAction} />

          <div className="grid grid-cols-2 gap-5">
            <Panel title="Microtask Queue" items={state.microtasks} />

            <Panel title="Macrotask Queue" items={state.macrotasks} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, items = [], currentTime = 0 }) {
  return (
    <div className="bg-[#16171b]/80 backdrop-blur-xl rounded-3xl p-4 border border-white/5 min-h-[220px] shadow-[0_10px_40px_rgba(0,0,0,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] transition-shadow duration-300">
      <h3 className="font-semibold mb-3 text-amber-200 tracking-wide">
        {title}
      </h3>

      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="text-slate-500 text-sm">Empty</div>
        ) : (
          items.map((item, index) => {
            const isTimer = typeof item === "object" && item.type === "timeout";

            const remaining = isTimer
              ? Math.max(0, item.expiresAt - currentTime)
              : null;

            return (
              <motion.div
                key={item.id ?? index}
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
                {isTimer ? (
                  <>
                    <div>setTimeout</div>

                    <div className="text-xs text-slate-400 mt-1">
                      Delay: {item.delay}ms
                    </div>

                    <div className="text-xs text-amber-300 mt-1">
                      Remaining: {remaining}ms
                    </div>
                  </>
                ) : (
                  item
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

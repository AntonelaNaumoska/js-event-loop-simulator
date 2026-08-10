export async function runSimulation(
  instructions,
  update,
  speed = 1000,
  shouldStop,
) {
  const callStack = [];
  const webApis = [];
  const microtasks = [];
  const macrotasks = [];
  const output = [];

  const wait = () => new Promise((resolve) => setTimeout(resolve, speed));

  // Execute synchronous code
  for (const instr of instructions) {
    if (shouldStop()) return;

    callStack.push(instr.type);

    update({
      callStack: [...callStack],
      webApis: [...webApis],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
    });

    await wait();

    if (shouldStop()) return;

    if (instr.type === "log") {
      output.push(instr.value);
    }

    if (instr.type === "promise") {
      microtasks.push(instr.value);
    }

    if (instr.type === "timeout") {
      // Move to Web APIs first
      webApis.push(instr.value);

      update({
        callStack: [...callStack],
        webApis: [...webApis],
        microtasks: [...microtasks],
        macrotasks: [...macrotasks],
        output: [...output],
      });

      await wait();

      // Timer expires and moves to Macrotask Queue
      webApis.shift();
      macrotasks.push(instr.value);

      update({
        callStack: [...callStack],
        webApis: [...webApis],
        microtasks: [...microtasks],
        macrotasks: [...macrotasks],
        output: [...output],
      });

      await wait();
    }

    callStack.pop();

    update({
      callStack: [...callStack],
      webApis: [...webApis],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
    });
    await wait();
  }

  // Execute microtasks
  while (microtasks.length) {
    if (shouldStop()) return;

    const task = microtasks.shift();

    callStack.push("promise callback");
    update({
      callStack: [...callStack],
      webApis: [...webApis],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
    });

    await wait();

    if (shouldStop()) return;

    output.push(task);

    callStack.pop();

    update({
      callStack: [...callStack],
      webApis: [...webApis],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
    });

    await wait();
  }

  // Execute macrotasks
  while (macrotasks.length) {
    if (shouldStop()) return;

    const task = macrotasks.shift();

    callStack.push("timeout callback");

    update({
      callStack: [...callStack],
      webApis: [...webApis],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
    });

    await wait();

    if (shouldStop()) return;

    output.push(task);

    callStack.pop();

    update({
      callStack: [...callStack],
      webApis: [...webApis],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
    });

    await wait();
  }
}

// ==========================================
// DYNAMIC STEP SIMULATION
// ==========================================

export function createSimulation(instructions) {
  const callStack = [];
  const webApis = [];
  const microtasks = [];
  const macrotasks = [];
  const output = [];

  let instructionIndex = 0;
  let phase = "sync";
  let currentInstruction = null;
  let currentTask = null;
  let stage = "enter";
  let finished = false;

  function getState() {
    return {
      callStack: [...callStack],
      webApis: [...webApis],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
    };
  }

  function step() {
    if (finished) {
      return {
        state: getState(),
        action: "Simulation completed",
        finished: true,
      };
    }

    // ======================================
    // SYNCHRONOUS CODE
    // ======================================
    if (phase === "sync") {
      // 1. Enter Call Stack
      if (stage === "enter") {
        if (instructionIndex >= instructions.length) {
          phase = "microtask";
          stage = "enter";

          return {
            state: getState(),
            action: "Synchronous code completed",
            finished: false,
          };
        }

        currentInstruction = instructions[instructionIndex++];
        callStack.push(currentInstruction.type);
        stage = "execute";

        return {
          state: getState(),
          action: `${currentInstruction.type} entered Call Stack`,
          finished: false,
        };
      }

      // 2. Execute instruction
      if (stage === "execute") {
        const instr = currentInstruction;

        if (instr.type === "log") {
          output.push(instr.value);
        }

        // IMPORTANT:
        // Do NOT add Promise/Timeout to queues yet.
        // We wait until the stack frame is removed.

        stage = "leave";

        return {
          state: getState(),
          action: `Executing ${instr.type}`,
          finished: false,
        };
      }

      // 3. Leave Call Stack
      if (stage === "leave") {
        const instr = currentInstruction;

        callStack.pop();

        // Now schedule the async task
        if (instr.type === "promise") {
          microtasks.push(instr.value);
        }

        if (instr.type === "timeout") {
          macrotasks.push(instr.value);
        }

        currentInstruction = null;
        stage = "enter";

        return {
          state: getState(),
          action: "Call Stack operation completed",
          finished: false,
        };
      }
    }

    // ======================================
    // MICROTASKS
    // ======================================
    if (phase === "microtask") {
      if (stage === "enter") {
        if (microtasks.length === 0) {
          phase = "macrotask";
          stage = "enter";

          return {
            state: getState(),
            action: "Microtask queue completed",
            finished: false,
          };
        }

        currentTask = microtasks.shift();
        callStack.push("promise callback");
        stage = "execute";

        return {
          state: getState(),
          action: "Promise callback entered Call Stack",
          finished: false,
        };
      }

      if (stage === "execute") {
        output.push(currentTask);
        stage = "leave";

        return {
          state: getState(),
          action: "Running microtask callback",
          finished: false,
        };
      }

      if (stage === "leave") {
        callStack.pop();
        currentTask = null;
        stage = "enter";

        return {
          state: getState(),
          action: "Microtask callback completed",
          finished: false,
        };
      }
    }

    // ======================================
    // MACROTASKS
    // ======================================
    if (phase === "macrotask") {
      if (stage === "enter") {
        if (macrotasks.length === 0) {
          finished = true;

          return {
            state: getState(),
            action: "Simulation completed",
            finished: true,
          };
        }

        currentTask = macrotasks.shift();
        callStack.push("timeout callback");
        stage = "execute";

        return {
          state: getState(),
          action: "Timeout callback entered Call Stack",
          finished: false,
        };
      }

      if (stage === "execute") {
        output.push(currentTask);
        stage = "leave";

        return {
          state: getState(),
          action: "Running macrotask callback",
          finished: false,
        };
      }

      if (stage === "leave") {
        callStack.pop();
        currentTask = null;
        stage = "enter";

        return {
          state: getState(),
          action: "Macrotask callback completed",
          finished: false,
        };
      }
    }

    return {
      state: getState(),
      action: "Idle",
      finished: false,
    };
  }

  return {
    step,
    getState,
    isFinished: () => finished,
  };
}

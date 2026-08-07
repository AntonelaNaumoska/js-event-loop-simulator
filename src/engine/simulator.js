export async function runSimulation(
  instructions,
  update,
  speed = 1000,
  shouldStop,
) {
  const callStack = [];
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
      macrotasks.push(instr.value);
    }

    callStack.pop();

    update({
      callStack: [...callStack],
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
  const microtasks = [];
  const macrotasks = [];
  const output = [];

  let instructionIndex = 0;

  let phase = "sync";

  let currentInstruction = null;

  let currentTask = null;

  let syncStage = "take";

  let taskStage = "take";

  let finished = false;

  function getState() {
    return {
      callStack: [...callStack],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
    };
  }

  function step() {
    // ==========================================
    // SIMULATION FINISHED
    // ==========================================

    if (finished) {
      return {
        state: getState(),
        action: "Simulation completed",
        finished: true,
      };
    }

    // ==========================================
    // SYNCHRONOUS CODE
    // ==========================================

    if (phase === "sync") {
      // ----------------------------------------
      // TAKE NEXT INSTRUCTION
      // ----------------------------------------

      if (syncStage === "take") {
        if (instructionIndex >= instructions.length) {
          phase = "microtask";

          return {
            state: getState(),
            action: "Synchronous code completed",
            finished: false,
          };
        }

        currentInstruction = instructions[instructionIndex];

        instructionIndex++;

        callStack.push(currentInstruction.type);

        syncStage = "execute";

        return {
          state: getState(),
          action: `Call Stack: ${currentInstruction.type}`,
          finished: false,
        };
      }

      // ----------------------------------------
      // EXECUTE INSTRUCTION
      // ----------------------------------------

      if (syncStage === "execute") {
        const instr = currentInstruction;

        if (instr.type === "log") {
          output.push(instr.value);
        }

        if (instr.type === "promise") {
          microtasks.push(instr.value);
        }

        if (instr.type === "timeout") {
          macrotasks.push(instr.value);
        }

        syncStage = "remove";

        return {
          state: getState(),
          action: `Executing ${instr.type}`,
          finished: false,
        };
      }

      // ----------------------------------------
      // REMOVE FROM CALL STACK
      // ----------------------------------------

      if (syncStage === "remove") {
        callStack.pop();

        currentInstruction = null;

        syncStage = "take";

        return {
          state: getState(),
          action: "Call Stack operation completed",
          finished: false,
        };
      }
    }

    // ==========================================
    // MICROTASK QUEUE
    // ==========================================

    if (phase === "microtask") {
      // ----------------------------------------
      // TAKE MICROTASK
      // ----------------------------------------

      if (taskStage === "take") {
        if (microtasks.length === 0) {
          phase = "macrotask";

          return {
            state: getState(),
            action: "Microtask Queue is empty",
            finished: false,
          };
        }

        currentTask = microtasks.shift();

        taskStage = "enter";

        return {
          state: getState(),
          action: "Event Loop takes Microtask",
          finished: false,
        };
      }

      // ----------------------------------------
      // MOVE MICROTASK TO CALL STACK
      // ----------------------------------------

      if (taskStage === "enter") {
        callStack.push("promise callback");

        taskStage = "execute";

        return {
          state: getState(),
          action: "Microtask moved to Call Stack",
          finished: false,
        };
      }

      // ----------------------------------------
      // EXECUTE MICROTASK
      // ----------------------------------------

      if (taskStage === "execute") {
        output.push(currentTask);

        taskStage = "remove";

        return {
          state: getState(),
          action: "Running microtask callback",
          finished: false,
        };
      }

      // ----------------------------------------
      // REMOVE MICROTASK FROM CALL STACK
      // ----------------------------------------

      if (taskStage === "remove") {
        callStack.pop();

        currentTask = null;

        taskStage = "take";

        return {
          state: getState(),
          action: "Microtask completed",
          finished: false,
        };
      }
    }

    // ==========================================
    // MACROTASK QUEUE
    // ==========================================

    if (phase === "macrotask") {
      // ----------------------------------------
      // TAKE MACROTASK
      // ----------------------------------------

      if (taskStage === "take") {
        if (macrotasks.length === 0) {
          finished = true;

          return {
            state: getState(),
            action: "Simulation completed",
            finished: true,
          };
        }

        currentTask = macrotasks.shift();

        taskStage = "enter";

        return {
          state: getState(),
          action: "Event Loop takes Macrotask",
          finished: false,
        };
      }

      // ----------------------------------------
      // MOVE MACROTASK TO CALL STACK
      // ----------------------------------------

      if (taskStage === "enter") {
        callStack.push("timeout callback");

        taskStage = "execute";

        return {
          state: getState(),
          action: "Macrotask moved to Call Stack",
          finished: false,
        };
      }

      // ----------------------------------------
      // EXECUTE MACROTASK
      // ----------------------------------------

      if (taskStage === "execute") {
        output.push(currentTask);

        taskStage = "remove";

        return {
          state: getState(),
          action: "Running macrotask callback",
          finished: false,
        };
      }

      // ----------------------------------------
      // REMOVE MACROTASK FROM CALL STACK
      // ----------------------------------------

      if (taskStage === "remove") {
        callStack.pop();

        currentTask = null;

        taskStage = "take";

        return {
          state: getState(),
          action: "Macrotask completed",
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

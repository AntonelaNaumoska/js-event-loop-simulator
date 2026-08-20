// ==========================================
// RUN SIMULATION
// ==========================================

export async function runSimulation(
  instructions,
  update,
  speed = 1000,
  shouldStop,
) {
  const simulation = createSimulation(instructions);

  while (!simulation.isFinished()) {
    if (shouldStop()) return;

    const result = simulation.step();

    update(result.state, result.action);

    if (result.finished) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, speed));
  }
}

// ==========================================
// DYNAMIC STEP SIMULATION
// ==========================================

// ==========================================
// DYNAMIC STEP SIMULATION
// ==========================================

export function createSimulation(instructions) {
  const callStack = [];
  const webApis = [];
  const microtasks = [];
  const macrotasks = [];
  const output = [];

  // Internal timers
  const timers = [];

  let instructionIndex = 0;

  // Current operation being visualized
  let currentOperation = null;
  // Microtask currently executing
  let currentMicrotask = null;

  // Macrotask currently executing
  let currentMacrotask = null;

  // Stage of the current operation
  //
  // enter   -> put operation into Call Stack
  // execute -> execute the operation
  // leave   -> remove operation from Call Stack
  //
  let stage = "enter";

  // Simulation completed
  let finished = false;

  // Simulated JavaScript time
  let currentTime = 0;

  // How much simulated time passes
  // when a timer is waiting.
  const TIME_STEP = 500;

  // ==========================================
  // STATE
  // ==========================================

  function getState() {
    return {
      callStack: [...callStack],
      webApis: [...webApis],
      microtasks: [...microtasks],
      macrotasks: [...macrotasks],
      output: [...output],
      currentTime,
    };
  }

  // ==========================================
  // TIMER HANDLING
  // ==========================================

  function moveExpiredTimers() {
    const expiredTimers = timers.filter(
      (timer) => timer.expiresAt <= currentTime,
    );

    for (const timer of expiredTimers) {
      // Remove from Web APIs
      const webApiIndex = webApis.findIndex((item) => item.id === timer.id);

      if (webApiIndex !== -1) {
        webApis.splice(webApiIndex, 1);
      }

      // Move callback to Macrotask Queue
      macrotasks.push(timer.value);

      // Remove internal timer
      const timerIndex = timers.indexOf(timer);

      if (timerIndex !== -1) {
        timers.splice(timerIndex, 1);
      }
    }
  }

  // ==========================================
  // ADVANCE SIMULATED TIME
  // ==========================================

  function advanceSimulatedTime() {
    if (timers.length === 0) {
      return null;
    }

    // Find timer that expires first
    const nextTimer = timers.reduce(
      (earliest, timer) =>
        timer.expiresAt < earliest.expiresAt ? timer : earliest,
      timers[0],
    );

    const previousTime = currentTime;

    currentTime = Math.min(currentTime + TIME_STEP, nextTimer.expiresAt);

    const expired = currentTime >= nextTimer.expiresAt;

    if (expired) {
      moveExpiredTimers();
    }

    return {
      previousTime,
      currentTime,
      expired,
      timer: nextTimer,
    };
  }

  // ==========================================
  // GET OPERATION NAME
  // ==========================================

  function getCallStackName(operation) {
    if (!operation) {
      return "unknown";
    }

    switch (operation.type) {
      case "log":
        return "console.log";

      case "promise":
        return "Promise";

      case "timeout":
        return "setTimeout";

      default:
        return operation.type;
    }
  }

  // ==========================================
  // STEP
  //
  // IMPORTANT:
  //
  // One step = ONE visualization change.
  //
  // console.log:
  //
  // Step 1 → Call Stack
  // Step 2 → Execute / output
  // Step 3 → remove from Call Stack
  //
  // setTimeout:
  //
  // Step 1 → Call Stack
  // Step 2 → Web APIs
  // Step 3 → remove from Call Stack
  //
  // ==========================================

  function step() {
    if (finished) {
      return {
        state: getState(),
        action: "Simulation completed",
        finished: true,
      };
    }

    // ========================================
    // 1. CURRENT SYNCHRONOUS OPERATION
    // ========================================

    if (currentOperation) {
      const operation = currentOperation;
      const name = getCallStackName(operation);

      // --------------------------------------
      // ENTER
      // --------------------------------------

      if (stage === "enter") {
        callStack.push(name);

        stage = "execute";

        return {
          state: getState(),
          action: `${name} entered Call Stack`,
          finished: false,
        };
      }

      // --------------------------------------
      // EXECUTE
      // --------------------------------------

      if (stage === "execute") {
        // ==============================
        // console.log()
        // ==============================

        if (operation.type === "log") {
          output.push(operation.value);

          stage = "leave";

          return {
            state: getState(),
            action: `Executing console.log("${operation.value}")`,
            finished: false,
          };
        }

        // ==============================
        // Promise
        // ==============================

        if (operation.type === "promise") {
          microtasks.push(operation.value);

          stage = "leave";

          return {
            state: getState(),
            action: "Promise callback added to Microtask Queue",
            finished: false,
          };
        }

        // ==============================
        // setTimeout()
        // ==============================

        if (operation.type === "timeout") {
          const delay = Number(operation.delay) || 0;

          const timerId = `timer-${Date.now()}-${Math.random()}`;

          const timer = {
            id: timerId,
            value: operation.value,
            delay,
            expiresAt: currentTime + delay,
          };

          timers.push(timer);

          webApis.push({
            id: timerId,
            type: "timeout",
            value: operation.value,
            delay,
            expiresAt: timer.expiresAt,
          });

          stage = "leave";

          return {
            state: getState(),
            action: `setTimeout(${delay}ms) started in Web APIs`,
            finished: false,
          };
        }

        // ==============================
        // Unknown instruction
        // ==============================

        stage = "leave";

        return {
          state: getState(),
          action: `Executing ${operation.type}`,
          finished: false,
        };
      }

      // --------------------------------------
      // LEAVE
      // --------------------------------------

      if (stage === "leave") {
        callStack.pop();

        const finishedOperation = currentOperation;

        currentOperation = null;
        stage = "enter";

        return {
          state: getState(),

          action: `${getCallStackName(
            finishedOperation,
          )} removed from Call Stack`,

          finished: false,
        };
      }
    }

    // ========================================
    // 2. GET NEXT SYNCHRONOUS INSTRUCTION
    // ========================================

    if (instructionIndex < instructions.length) {
      currentOperation = instructions[instructionIndex];

      instructionIndex++;

      stage = "enter";

      // Immediately process ENTER.
      callStack.push(getCallStackName(currentOperation));

      stage = "execute";

      return {
        state: getState(),

        action: `${getCallStackName(currentOperation)} entered Call Stack`,

        finished: false,
      };
    }

    // ========================================
    // 3. MICROTASK QUEUE
    //
    // Microtasks always run before
    // timers/macrotasks.
    // ========================================

    if (microtasks.length > 0 || currentMicrotask) {
      if (!currentMicrotask) {
        currentMicrotask = microtasks.shift();

        callStack.push("promise callback");

        return {
          state: getState(),
          action: "Promise callback entered Call Stack",
          finished: false,
        };
      }

      output.push(currentMicrotask);

      callStack.pop();

      const value = currentMicrotask;
      currentMicrotask = null;

      return {
        state: getState(),
        action: `Promise callback executed: ${value}`,
        finished: false,
      };
    }

    // ========================================
    // 4. EXPIRED MACROTASK
    // ========================================

    if (macrotasks.length > 0 || currentMacrotask) {
      if (!currentMacrotask) {
        currentMacrotask = macrotasks.shift();

        callStack.push("timeout callback");

        return {
          state: getState(),
          action: "Timeout callback entered Call Stack",
          finished: false,
        };
      }

      output.push(currentMacrotask);

      callStack.pop();

      const value = currentMacrotask;
      currentMacrotask = null;

      return {
        state: getState(),
        action: `Timeout callback executed: ${value}`,
        finished: false,
      };
    }

    // ========================================
    // 5. TIMERS WAITING IN WEB APIs
    // ========================================

    if (timers.length > 0) {
      const result = advanceSimulatedTime();

      if (result.expired) {
        return {
          state: getState(),

          action:
            `Timer expired at ${currentTime}ms — ` +
            `moved from Web APIs to Macrotask Queue`,

          finished: false,
        };
      }

      return {
        state: getState(),

        action:
          `Timer waiting in Web APIs — ` + `simulated time: ${currentTime}ms`,

        finished: false,
      };
    }

    // ========================================
    // 6. FINISHED
    // ========================================

    finished = true;

    return {
      state: getState(),
      action: "Simulation completed",
      finished: true,
    };
  }

  // ==========================================
  // RETURN API
  // ==========================================

  return {
    step,
    getState,
    isFinished: () => finished,
  };
}

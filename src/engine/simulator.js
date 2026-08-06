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

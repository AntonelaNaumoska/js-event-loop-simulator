import * as acorn from "acorn";

export function parseCode(code) {
  const ast = acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "script",
  });

  const instructions = [];

  for (const node of ast.body) {
    // =====================================
    // console.log(...)
    // =====================================
    if (
      node.type === "ExpressionStatement" &&
      node.expression.type === "CallExpression" &&
      node.expression.callee?.object?.name === "console" &&
      node.expression.callee?.property?.name === "log"
    ) {
      const values = node.expression.arguments.map((arg) => {
        if (arg.type === "Literal") {
          return String(arg.value);
        }

        return "[expression]";
      });

      instructions.push({
        type: "log",
        value: values.join(" "),
      });

      continue;
    }

    // =====================================
    // setTimeout(() => console.log(...), 0)
    // =====================================
    if (
      node.type === "ExpressionStatement" &&
      node.expression.type === "CallExpression" &&
      node.expression.callee?.name === "setTimeout"
    ) {
      const callback = node.expression.arguments[0];

      let logArg = null;

      // Block body
      if (
        callback?.body?.type === "BlockStatement" &&
        callback.body.body?.[0]?.expression?.callee?.object?.name === "console"
      ) {
        logArg = callback.body.body[0].expression.arguments[0];
      }

      // Expression body
      if (
        callback?.body?.type === "CallExpression" &&
        callback.body.callee?.object?.name === "console"
      ) {
        logArg = callback.body.arguments[0];
      }

      if (logArg) {
        instructions.push({
          type: "timeout",
          value:
            logArg.type === "Literal" ? String(logArg.value) : "[expression]",
        });
      }

      continue;
    }

    // =====================================
    // Promise.resolve().then(...)
    // =====================================
    if (
      node.type === "ExpressionStatement" &&
      node.expression.type === "CallExpression" &&
      node.expression.callee?.property?.name === "then"
    ) {
      const callback = node.expression.arguments[0];

      let logArg = null;

      // Block body: () => { console.log('B'); }
      if (
        callback?.body?.type === "BlockStatement" &&
        callback.body.body?.[0]?.expression?.callee?.object?.name === "console"
      ) {
        logArg = callback.body.body[0].expression.arguments[0];
      }

      // Expression body: () => console.log('B')
      if (
        callback?.body?.type === "CallExpression" &&
        callback.body.callee?.object?.name === "console"
      ) {
        logArg = callback.body.arguments[0];
      }

      if (logArg) {
        instructions.push({
          type: "promise",
          value:
            logArg.type === "Literal" ? String(logArg.value) : "[expression]",
        });
      }

      continue;
    }
    // =====================================
    // queueMicrotask(() => console.log(...))
    // =====================================
    if (
      node.type === "ExpressionStatement" &&
      node.expression.type === "CallExpression" &&
      node.expression.callee?.name === "queueMicrotask"
    ) {
      const callback = node.expression.arguments[0];

      if (
        callback?.body?.body?.[0]?.expression?.callee?.object?.name ===
        "console"
      ) {
        const logArg = callback.body.body[0].expression.arguments[0];

        instructions.push({
          type: "promise",
          value:
            logArg.type === "Literal" ? String(logArg.value) : "[expression]",
        });
      }

      continue;
    }

    // =====================================
    // Unsupported statement
    // =====================================
    instructions.push({
      type: "unknown",
      value: "[unsupported statement]",
    });
  }

  return instructions;
}

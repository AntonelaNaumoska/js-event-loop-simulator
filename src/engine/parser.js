import * as acorn from 'acorn';

export function parseCode(code) {
  const ast = acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'script'
  });

  return ast.body.map((node) => {
    // console.log('text')
    if (
      node.type === 'ExpressionStatement' &&
      node.expression.callee?.object?.name === 'console'
    ) {
      return {
        type: 'log',
        value: node.expression.arguments[0].value
      };
    }

    // setTimeout(() => console.log('text'), 0)
    if (
      node.type === 'ExpressionStatement' &&
      node.expression.callee?.name === 'setTimeout'
    ) {
      const callback = node.expression.arguments[0];
      const log =
        callback.body.body[0].expression.arguments[0].value;

      return {
        type: 'timeout',
        value: log
      };
    }

    // Promise.resolve().then(() => console.log('text'))
    if (
      node.type === 'ExpressionStatement' &&
      node.expression.callee?.property?.name === 'then'
    ) {
      const callback = node.expression.arguments[0];
      const log =
        callback.body.body[0].expression.arguments[0].value;

      return {
        type: 'promise',
        value: log
      };
    }

    return { type: 'unknown' };
  });
}
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

export default function CodeEditor({ code, setCode }) {
  return (
    <CodeMirror
      value={code}
      height="500px"
      theme="dark"
      extensions={[javascript()]}
      onChange={(value) => setCode(value)}
    />
  );
}

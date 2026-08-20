import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "#111216",
  },
  ".cm-scroller": {
    backgroundColor: "#111216",
  },
  ".cm-gutters": {
    backgroundColor: "#111216",
    border: "none",
  },
});

export default function CodeEditor({ code, setCode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-black">
      <CodeMirror
        value={code}
        height="340px"
        theme={oneDark}
        extensions={[javascript(), editorTheme]}
        onChange={(value) => setCode(value)}
      />
    </div>
  );
}

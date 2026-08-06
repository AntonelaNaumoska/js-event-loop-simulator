export default function EventLoopCircle() {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex flex-col items-center justify-center min-h-[240px]">
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 rounded-full border-4 border-slate-600"></div>
        <div className="absolute inset-0 rounded-full border-t-4 border-r-4 border-yellow-400 animate-spin"></div>
      </div>

      <p className="text-slate-400 text-sm mt-4 text-center">
        Event Loop
      </p>
    </div>
  );
}
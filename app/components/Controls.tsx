interface ControlsProps {
  isConnected: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function Controls({
  isConnected,
  isRecording,
  onStartRecording,
  onStopRecording
}: ControlsProps) {
  const buttonBaseClasses = "px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all";
  const buttonClasses = isRecording
    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
    : "bg-blue-500 hover:bg-blue-600 text-white";
  const statusClasses = isConnected
    ? "bg-green-500 text-white"
    : "bg-red-500 text-white";

  return (
    <div className="p-4 border-t bg-white flex items-center gap-4">
      <button
        className={`${buttonBaseClasses} ${buttonClasses}`}
        onClick={isRecording ? onStopRecording : onStartRecording}
        disabled={!isConnected}
      >
        <span>{isRecording ? '⏺' : '🎤'}</span>
        <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
      </button>
      
      <div className={`px-4 py-2 rounded-lg text-sm ${statusClasses}`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
} 
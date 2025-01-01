interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  emotions?: string;
}

export function Message({ role, content, emotions }: MessageProps) {
  const baseClasses = "rounded-lg p-4 max-w-[80%] shadow-sm";
  const roleClasses = {
    user: "bg-blue-500 text-white ml-auto",
    assistant: "bg-white mr-auto",
    system: "bg-gray-100 text-gray-600 mx-auto text-sm"
  };

  return (
    <div className={`${baseClasses} ${roleClasses[role]}`}>
      <div>{content}</div>
      {emotions && (
        <div className="mt-2 pt-2 border-t border-white/10 text-sm opacity-90">
          Emotions: {emotions}
        </div>
      )}
    </div>
  );
} 
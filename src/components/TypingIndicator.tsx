const TypingIndicator = () => (
  <div className="flex gap-3 animate-fade-in">
    <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center shrink-0">
      <span className="text-accent-foreground text-xs font-bold">AI</span>
    </div>
    <div className="message-ai rounded-xl px-4 py-3 flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse-dot" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse-dot [animation-delay:0.2s]" />
      <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse-dot [animation-delay:0.4s]" />
    </div>
  </div>
);

export default TypingIndicator;

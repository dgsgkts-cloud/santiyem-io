interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
  linkText?: string;
  onLinkClick?: () => void;
  children?: React.ReactNode;
}

const EmptyState = ({
  icon,
  title,
  description,
  buttonText,
  onButtonClick,
  linkText,
  onLinkClick,
  children,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-muted/50 border border-border/60"
      aria-hidden
    >
      <span className="text-lg opacity-70 leading-none">{icon}</span>
    </div>
    <h3
      className="text-[14px] font-semibold text-foreground mb-1.5 tracking-tight"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {title}
    </h3>
    <p className="text-[12.5px] leading-relaxed text-muted-foreground max-w-xs mb-4">
      {description}
    </p>
    {children}
    {buttonText && onButtonClick && (
      <button
        onClick={onButtonClick}
        className="px-4 py-2 rounded-lg text-[12.5px] font-medium border border-border/70 bg-background hover:bg-muted/60 hover:border-[#FF6B2B]/40 transition-colors text-foreground"
      >
        {buttonText}
      </button>
    )}
    {linkText && onLinkClick && (
      <button
        onClick={onLinkClick}
        className="text-[12.5px] font-medium mt-3 hover:underline"
        style={{ color: "#FF6B2B" }}
      >
        {linkText}
      </button>
    )}
  </div>
);

export default EmptyState;

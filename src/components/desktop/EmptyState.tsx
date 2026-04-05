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

const EmptyState = ({ icon, title, description, buttonText, onButtonClick, linkText, onLinkClick, children }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <span className="text-5xl mb-4">{icon}</span>
    <h3 className="text-base font-bold text-foreground mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {title}
    </h3>
    <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>
    {children}
    {buttonText && onButtonClick && (
      <button
        onClick={onButtonClick}
        className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: "#FF6B2B" }}
      >
        {buttonText}
      </button>
    )}
    {linkText && onLinkClick && (
      <button
        onClick={onLinkClick}
        className="text-sm font-medium mt-3"
        style={{ color: "#FF6B2B" }}
      >
        {linkText}
      </button>
    )}
  </div>
);

export default EmptyState;

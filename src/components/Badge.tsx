
const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <span className={`bg-gray-300 text-gray-800 px-2 py-1 rounded-full text-xs ${className}`}>{children}</span>;
};

export default Badge;

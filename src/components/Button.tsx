
const Button = ({
  children,
  onClick,
  className = '',
  variant = 'primary',  
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';  
}) => {

  const buttonClass = variant === 'secondary'
    ? 'bg-gray-500 text-white'  
    : variant === 'ghost'
    ? 'bg-transparent text-blue-500 border border-blue-500'  
    : 'bg-blue-500 text-white'; 

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg hover:bg-blue-600 focus:outline-none ${buttonClass} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;

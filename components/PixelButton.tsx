import React from 'react';

interface Props {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
}

const PixelButton: React.FC<Props> = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  'aria-label': ariaLabel,
  type = 'button'
}) => {
  const base = "px-4 py-2.5 relative transition-all active:translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none pixel-font uppercase tracking-widest text-[10px] pixel-corners flex items-center justify-center min-h-[44px]";
  
  const variants = {
    primary: "bg-[#061806] hover:bg-[#0c2a0c] border-2 border-green-800 text-green-300 hover:text-green-100 shadow-[0_3px_0_0_#020802]",
    secondary: "bg-[#080d08] hover:bg-[#101a10] border-2 border-green-950/80 text-green-500 hover:text-green-300 shadow-[0_3px_0_0_#020802]",
    danger: "bg-red-950/30 hover:bg-red-900/40 border-2 border-red-900 text-red-400 hover:text-red-200 shadow-[0_3px_0_0_#020802]",
    success: "bg-[#22c55e] hover:bg-[#16a34a] border-2 border-[#15803d] text-black font-bold shadow-[0_3px_0_0_#052e16]",
    ghost: "bg-transparent hover:bg-green-950/20 border-transparent text-green-500 hover:text-green-300"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default PixelButton;

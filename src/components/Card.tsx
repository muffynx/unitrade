// src/components/Card.tsx
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <div className={`rounded-xl border shadow p-4 ${className}`}>{children}</div>;
};

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <div className={`border-b py-2 ${className}`}>{children}</div>;
};

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <div className={`text-xl font-semibold ${className}`}>{children}</div>;
};

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return <div className={`p-4 ${className}`}>{children}</div>;
};

export { Card, CardHeader, CardTitle, CardContent };

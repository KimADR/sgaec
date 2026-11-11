import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export default function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return <header className="page-header">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="page-title">{title}</h1>
      <p className="page-description">{description}</p>
    </div>
    {actions && <div className="page-header-actions">{actions}</div>}
  </header>;
}

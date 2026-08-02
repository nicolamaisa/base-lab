import { constants } from "../../config/constants";
import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow = constants.appName,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="pageHeader">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="pageHeaderActions">{actions}</div> : null}
    </header>
  );
}

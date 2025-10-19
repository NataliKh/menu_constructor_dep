import React from "react";
import styles from "./Select.module.css";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...rest }, ref) => {
    return (
      <select ref={ref} className={[styles._select, className].filter(Boolean).join(" ")} {...rest}>
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";


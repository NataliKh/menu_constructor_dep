import React from "react";
import styles from "./Input.module.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => {
    return <input ref={ref} className={[styles._input, className].filter(Boolean).join(" ")} {...rest} />;
  }
);
Input.displayName = "Input";


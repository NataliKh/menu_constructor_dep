import React from "react";
import styles from "./IconButton.module.css";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  danger?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ danger, className, children, ...rest }) => {
  return (
    <button
      className={[styles._iconBtn, danger ? styles._danger : "", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
};


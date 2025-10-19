import React from "react";
import styles from "./TextArea.module.css";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...rest }, ref) => {
    return (
      <textarea ref={ref} className={[styles._textarea, className].filter(Boolean).join(" ")} {...rest} />
    );
  }
);
TextArea.displayName = "TextArea";


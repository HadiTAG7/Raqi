"use client";

import { Button, type ButtonProps } from "./button";

/** زر إرسال يطلب تأكيداً قبل إرسال النموذج الذي يحتويه. */
export function ConfirmButton({ message, onClick, ...props }: ButtonProps & { message: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    />
  );
}

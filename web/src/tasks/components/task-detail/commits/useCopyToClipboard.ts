import { useCallback, useState } from "react";

export function useCopyToClipboard(label: string): {
  copied: boolean;
  copy: (text: string) => void;
  copyLabel: string;
} {
  const [copied, setCopied] = useState(false);

  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => {
        /* clipboard denied */
      },
    );
  }, []);

  return {
    copied,
    copy,
    copyLabel: copied ? "Copied" : label,
  };
}

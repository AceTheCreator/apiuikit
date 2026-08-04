import type { ExtensionComponentProps } from "../types";
import { resolveLogo } from "./logoValue";

export default function LogoExtension({ value }: ExtensionComponentProps) {
  const logo = resolveLogo(value);
  if (!logo) return null;

  return (
    <img
      src={logo.url}
      alt={logo.altText ?? "logo"}
      style={logo.backgroundColor ? { backgroundColor: logo.backgroundColor } : undefined}
      className="max-h-24 max-w-24 object-contain"
    />
  );
}

import Image from "next/image";

export function SiriusIcon({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/brand/sirius-icon.svg"
      alt="Sirius"
      width={60}
      height={58}
      className={className}
      priority
    />
  );
}

export function SiriusLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/brand/sirius-logo.svg"
      alt="Sirius Software"
      width={237}
      height={58}
      className={className}
      priority
    />
  );
}

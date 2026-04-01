import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";
import type { CSSProperties } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  className?: string;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  /** Si vrai : pas de `text-3xl` / `font-light` par défaut — uniquement les classes du titre (ex. typo Hero / Instagram). */
  titlePresetNone?: boolean;
};

export function SectionHeading({
  eyebrow,
  title,
  className = "",
  titleClassName = "",
  titleStyle,
  titlePresetNone = false,
}: Props) {
  const titleDefaultClass = titlePresetNone
    ? ""
    : "font-[family-name:var(--font-serif)] text-3xl font-light tracking-tight text-[#0a0a0a] md:text-4xl";
  return (
    <header className={`mx-auto max-w-6xl px-6 md:px-10 ${className}`}>
      {eyebrow ? (
        <MotionDiv
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.35em] text-[#6b6b6b]"
        >
          {eyebrow}
        </MotionDiv>
      ) : null}
      <MotionDiv
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        className={[eyebrow ? "mt-3" : "", titleDefaultClass, titleClassName].filter(Boolean).join(" ")}
        style={titleStyle}
      >
        {title}
      </MotionDiv>
    </header>
  );
}

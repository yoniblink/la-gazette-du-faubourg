import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";

type Props = {
  eyebrow?: string;
  title: string;
  className?: string;
};

export function SectionHeading({ eyebrow, title, className = "" }: Props) {
  return (
    <header
      className={`mx-auto max-w-6xl pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] md:px-10 ${className}`}
    >
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
        className={`${eyebrow ? "mt-3" : ""} font-[family-name:var(--font-serif)] text-3xl font-light tracking-tight text-[#0a0a0a] md:text-4xl`}
      >
        {title}
      </MotionDiv>
    </header>
  );
}

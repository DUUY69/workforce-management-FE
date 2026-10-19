import { useEffect, useRef, useState, useCallback } from "react";

export function useScrollReveal({ threshold = 0.08, once = true } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setArmed(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const el = ref.current;
    if (!el) return;

    const show = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          if (once) obs.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [armed, threshold, once]);

  return { ref, visible: armed && visible, armed };
}

function useParallax(ref, enabled, amount = 28) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height * 0.5;
      const ratio = (center - vh * 0.5) / vh;
      const y = Math.max(-amount, Math.min(amount, ratio * amount * -1.2));
      el.style.setProperty("--careers-parallax-y", `${y.toFixed(2)}px`);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref, enabled, amount]);
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "up",
  parallax = false,
  parallaxAmount = 28,
}) {
  const { ref, visible } = useScrollReveal();
  const innerRef = useRef(null);
  const delayClass = delay ? `careers-reveal-delay-${Math.min(delay, 4)}` : "";
  const variantClass = variant ? `careers-reveal-${variant}` : "careers-reveal-up";

  useParallax(innerRef, parallax && visible, parallaxAmount);

  return (
    <div
      ref={ref}
      className={`careers-reveal ${variantClass} ${visible ? "is-visible" : ""} ${delayClass} ${className}`}
    >
      <div
        ref={parallax ? innerRef : null}
        className={parallax ? "careers-parallax-inner" : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export function useHeroScrollFade() {
  const [offset, setOffset] = useState(0);

  const onScroll = useCallback(() => {
    const y = window.scrollY;
    setOffset(Math.min(y * 0.35, 120));
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return offset;
}

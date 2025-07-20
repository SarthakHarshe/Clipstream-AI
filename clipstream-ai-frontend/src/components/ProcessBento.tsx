import React, { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { Upload, Brain, Sparkles, Share2 } from "lucide-react";

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  step?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ComponentType<any>;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
}

export interface ProcessBentoProps {
  textAutoHide?: boolean;
  _enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  _enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  _enableMagnetism?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = "132, 0, 255";
const MOBILE_BREAKPOINT = 768;

const processSteps: BentoCardProps[] = [
  {
    color: "#1a0b2e",
    title: "Upload",
    description: "Drop your video or podcast file",
    label: "Step 01",
    step: "01",
    icon: Upload,
  },
  {
    color: "#0f1419",
    title: "Process",
    description: "AI analyzes and identifies key moments",
    label: "Step 02",
    step: "02",
    icon: Brain,
  },
  {
    color: "#1e1b4b",
    title: "Generate",
    description: "Create optimized clips automatically",
    label: "Step 03",
    step: "03",
    icon: Sparkles,
  },
  {
    color: "#164e63",
    title: "Share",
    description: "Download and distribute your content",
    label: "Step 04",
    step: "04",
    icon: Share2,
  },
];

const createParticleElement = (
  x: number,
  y: number,
  color: string = DEFAULT_GLOW_COLOR,
): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  spotlightRadius: number,
  glowColor: string,
) => {
  const rect = card.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distance = Math.sqrt(
    Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2),
  );

  const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);

  if (distance <= proximity) {
    const intensity = 1 - distance / proximity;
    card.style.setProperty(
      "--glow-opacity",
      Math.max(0.3, intensity).toString(),
    );
    card.style.setProperty("--glow-color", glowColor);
  } else if (distance <= fadeDistance) {
    const fadeIntensity =
      1 - (distance - proximity) / (fadeDistance - proximity);
    card.style.setProperty(
      "--glow-opacity",
      Math.max(0.1, fadeIntensity * 0.3).toString(),
    );
    card.style.setProperty("--glow-color", glowColor);
  } else {
    card.style.setProperty("--glow-opacity", "0");
  }
};

const ProcessBentoCard: React.FC<BentoCardProps> = ({
  color = "#060010",
  title = "Default Title",
  description = "Default Description",
  label = "Default Label",
  step = "01",
  icon: IconComponent,
  textAutoHide = false,
  disableAnimations = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!textAutoHide);

  useEffect(() => {
    if (disableAnimations) return;

    const card = cardRef.current;
    if (!card) return;

    const handleMouseEnter = () => {
      if (textAutoHide) setIsVisible(true);
      gsap.to(card, {
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      if (textAutoHide) setIsVisible(false);
      gsap.to(card, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    card.addEventListener("mouseenter", handleMouseEnter);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mouseenter", handleMouseEnter);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [textAutoHide, disableAnimations]);

  return (
    <div
      ref={cardRef}
      className="group bento-card relative flex h-[200px] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-white/10 p-6 transition-all duration-300"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 0 rgba(var(--glow-color, 132, 0, 255), var(--glow-opacity, 0))`,
      }}
    >
      {/* Step Number */}
      <div className="absolute top-4 right-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-600 text-sm font-bold text-white">
          {step}
        </div>
      </div>

      {/* Icon */}
      <div className="mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
          {IconComponent && <IconComponent className="h-6 w-6 text-white" />}
        </div>
      </div>

      {/* Content */}
      <div
        className={`transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
      >
        <div className="mb-2">
          <span className="text-xs font-medium text-purple-300">{label}</span>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-300">{description}</p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
};

const ProcessBento: React.FC<ProcessBentoProps> = ({
  textAutoHide = false,
  _enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  _enableTilt = true,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  _enableMagnetism = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (disableAnimations || isMobile) return;

      const container = containerRef.current;
      if (!container) return;

      if (enableSpotlight || enableBorderGlow) {
        const cards = container.querySelectorAll(".bento-card");
        cards.forEach((card) => {
          updateCardGlowProperties(
            card as HTMLElement,
            event.clientX,
            event.clientY,
            spotlightRadius,
            glowColor,
          );
        });
      }
    },
    [
      disableAnimations,
      enableSpotlight,
      enableBorderGlow,
      spotlightRadius,
      glowColor,
      isMobile,
    ],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!clickEffect || disableAnimations || isMobile) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      for (let i = 0; i < particleCount; i++) {
        const particle = createParticleElement(x, y, glowColor);
        container.appendChild(particle);

        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 50 + Math.random() * 100;
        const targetX = x + Math.cos(angle) * distance;
        const targetY = y + Math.sin(angle) * distance;

        gsap.to(particle, {
          x: targetX - x,
          y: targetY - y,
          opacity: 0,
          scale: 0,
          duration: 0.8 + Math.random() * 0.4,
          ease: "power2.out",
          onComplete: () => {
            if (container.contains(particle)) {
              container.removeChild(particle);
            }
          },
        });
      }
    },
    [clickEffect, disableAnimations, particleCount, glowColor, isMobile],
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div
        ref={containerRef}
        className="relative grid grid-cols-1 gap-6 p-6 md:grid-cols-2"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {processSteps.map((step, index) => (
          <ProcessBentoCard
            key={index}
            {...step}
            textAutoHide={textAutoHide}
            disableAnimations={disableAnimations}
          />
        ))}
      </div>
    </div>
  );
};

export default ProcessBento;

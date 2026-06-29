import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 24; // Increased gap for a more spacious feel
const SPRING_OPTIONS = { type: 'spring', stiffness: 300, damping: 30 };

export interface CarouselItemProps {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  durationMinutes: number;
  category: string;
}

type CarouselTransition = typeof SPRING_OPTIONS | { duration: number };

type CarouselCardProps = {
  item: CarouselItemProps;
  index: number;
  itemWidth: number;
  trackItemOffset: number;
  x: MotionValue<number>;
  transition: CarouselTransition;
  onBook?: () => void;
};

type CarouselProps = {
  items?: CarouselItemProps[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  onBook?: () => void;
};

type DragInfo = {
  offset: { x: number };
  velocity: { x: number };
};

function CarouselCard({ item, index, itemWidth, trackItemOffset, x, transition, onBook }: CarouselCardProps) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
  const outputRange = [40, 0, -40]; 
  const rotateY = useTransform(x, range, outputRange, { clamp: true });
  const scale = useTransform(x, range, [0.85, 1, 0.85], { clamp: true });
  const opacity = useTransform(x, range, [0.4, 1, 0.4], { clamp: true });
  const zIndex = useTransform(x, range, [0, 10, 0], { clamp: true });

  return (
    <motion.div
      className="relative flex flex-col flex-shrink-0 items-start justify-between overflow-hidden cursor-grab active:cursor-grabbing group bg-white border border-[#e8e0d4] rounded-[28px]"
      style={{
        width: itemWidth,
        height: 'min(520px, 70vh)',
        rotateY: rotateY,
        scale: scale,
        opacity: opacity,
        zIndex: zIndex,
        transformStyle: "preserve-3d"
      }}
      transition={transition}
      whileHover={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.08)" }}
    >
      <div className="relative w-full h-[220px] overflow-hidden flex-shrink-0">
        <motion.img 
          src={item.imageUrl || "/Hero_sec.png"} 
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = "/Hero_sec.png"; }}
          whileHover={{ scale: 1.08 }} 
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a18]/20 to-transparent" />
      </div>

      <div className="flex flex-col flex-1 p-8 w-full justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-medium text-[#2c5545] mb-2 md:mb-3">{item.category}</p>
          <h3 className="font-editorial text-[clamp(22px,6vw,28px)] text-[#1a1a18] mb-2 md:mb-3 leading-[1.1]">{item.name}</h3>
          <p className="text-[14px] text-[#7a7168] leading-[1.6] line-clamp-3">{item.description || "A premium ritual tailored to your needs."}</p>
        </div>
        
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[#e8e0d4]">
          <div>
            <p className="font-editorial text-2xl text-[#2c5545] leading-none">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(item.price)}
            </p>
            <p className="text-[12px] text-[#7a7168] mt-1">{item.durationMinutes} min session</p>
          </div>
          <motion.button
            className="w-10 h-10 rounded-full border border-[#e8e0d4] flex items-center justify-center hover:bg-[#2c5545] hover:border-[#2c5545] text-[#7a7168] hover:text-white transition-all duration-400"
            whileHover={{ scale: 1.1 }}
            onClick={(e) => { e.stopPropagation(); onBook?.(); }}
          >
            <ArrowRight className="w-4 h-4 transition-colors duration-300" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Carousel({
  items = [],
  baseWidth = 380, // Wider for elegant cards
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = true,
  loop = false,
  onBook
}: CarouselProps) {
  const [actualBaseWidth, setActualBaseWidth] = useState(baseWidth);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      setActualBaseWidth(mobile ? window.innerWidth * 0.85 : baseWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [baseWidth]);

  const containerPadding = 16;
  const itemWidth = actualBaseWidth - containerPadding * 2;
  const trackItemOffset = itemWidth + GAP;
  const itemsForRender = useMemo(() => {
    if (!loop) return items;
    if (items.length === 0) return [];
    return [items[items.length - 1], ...items, items[0]];
  }, [items, loop]);

  const [position, setPosition] = useState(loop ? 1 : 0);
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return undefined;
    if (pauseOnHover && isHovered) return undefined;

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1));
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length]);

  useEffect(() => {
    const startingPosition = loop ? 1 : 0;
    setPosition(startingPosition);
    x.set(-startingPosition * trackItemOffset);
  }, [items.length, loop, trackItemOffset, x]);

  useEffect(() => {
    if (!loop && position > itemsForRender.length - 1) {
      setPosition(Math.max(0, itemsForRender.length - 1));
    }
  }, [itemsForRender.length, loop, position]);

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationStart = () => setIsAnimating(true);

  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1) {
      setIsAnimating(false);
      return;
    }
    const lastCloneIndex = itemsForRender.length - 1;

    if (position === lastCloneIndex) {
      setIsJumping(true);
      const target = 1;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    if (position === 0) {
      setIsJumping(true);
      const target = items.length;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    setIsAnimating(false);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: DragInfo) => {
    const { offset, velocity } = info;
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;

    if (direction === 0) return;

    setPosition(prev => {
      const next = prev + direction;
      const max = itemsForRender.length - 1;
      return Math.max(0, Math.min(next, max));
    });
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0
        }
      };

  const activeIndex =
    items.length === 0 ? 0 : loop ? (position - 1 + items.length) % items.length : Math.min(position, items.length - 1);

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-full py-10"
    >
      <div className="w-full flex justify-start" style={{ perspective: 1200 }}>
        <motion.div
          className="flex items-center cursor-grab active:cursor-grabbing"
          drag={isAnimating ? false : 'x'}
          dragDirectionLock
          {...dragProps}
          style={{
            gap: `${GAP}px`,
            x,
            paddingLeft: `calc(50% - ${itemWidth / 2}px)`,
            paddingRight: `calc(50% - ${itemWidth / 2}px)`,
            transformStyle: "preserve-3d",
            width: "max-content",
            touchAction: "pan-y"
          }}
          onDragEnd={handleDragEnd}
          animate={{ x: -(position * trackItemOffset) }}
          transition={effectiveTransition}
          onAnimationStart={handleAnimationStart}
          onAnimationComplete={handleAnimationComplete}
        >
          {itemsForRender.map((item, index) => (
            <CarouselCard
              key={`${item.id}-${index}`}
              item={item}
              index={index}
              itemWidth={itemWidth}
              trackItemOffset={trackItemOffset}
              x={x}
              transition={effectiveTransition}
              onBook={onBook}
            />
          ))}
        </motion.div>
      </div>

      <div className="mt-12 flex justify-center w-full relative z-10">
        <div className="flex justify-center gap-3">
          {items.map((_, index) => (
            <motion.button
              type="button"
              key={index}
              className={`h-2 w-2 rounded-full cursor-pointer transition-colors duration-300 ${
                activeIndex === index ? 'bg-[#2c5545]' : 'bg-[#e8e0d4]'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={activeIndex === index}
              animate={{
                scale: activeIndex === index ? 1.4 : 1
              }}
              onClick={() => setPosition(loop ? index + 1 : index)}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

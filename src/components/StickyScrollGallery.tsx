import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const GALLERY_CONTENT = [
  {
    title: "Master stylists & colorists",
    description: "Industry-leading experts dedicated to precision cuts, transformative color, and editorial styling.",
    image: "https://images.unsplash.com/photo-1521590832167-7bfc1738d5e9?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Premium product lines",
    description: "Exclusive partnerships with luxury haircare and skincare brands to ensure lasting, healthy results.",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Tranquil environment",
    description: "A beautifully curated atmosphere designed to offer an escape from the outside world.",
    image: "https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&q=80&w=1200"
  },
  {
    title: "Tailored consultations",
    description: "Every appointment begins with a thorough consultation to perfectly align with your vision and lifestyle.",
    image: "https://images.unsplash.com/photo-1600948836101-f9ff5f2e8f19?auto=format&fit=crop&q=80&w=1200"
  }
];

export default function StickyScrollGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isScrolling = false;

    const handleWheel = (e: WheelEvent) => {
      // If we are at the top and scrolling up, let the page scroll naturally
      if (e.deltaY < 0 && activeIndex === 0) return;
      // If we are at the bottom and scrolling down, let the page scroll naturally
      if (e.deltaY > 0 && activeIndex === GALLERY_CONTENT.length - 1) return;

      // Otherwise, prevent page scroll and cycle the accordion
      e.preventDefault();

      if (isScrolling) return;
      isScrolling = true;

      if (e.deltaY > 0) {
        setActiveIndex((prev) => Math.min(prev + 1, GALLERY_CONTENT.length - 1));
      } else {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }

      // Debounce the scroll to prevent rapid cycling
      setTimeout(() => {
        isScrolling = false;
      }, 700);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [activeIndex]);

  return (
    <section ref={containerRef} className="bg-white py-24 lg:py-32 relative">
      <div className="mx-auto w-full max-w-[1560px] px-6 md:px-10">
        
        <div className="flex justify-end mb-12 lg:mb-16">
          <div className="w-full lg:w-1/2 lg:pl-16 xl:pl-24">
            <h2 className="font-sans font-bold text-[clamp(2.5rem,4vw,3.5rem)] text-[#1a1a18] leading-[1.05] tracking-tight">
              Why clients choose our<br className="hidden md:block" /> expert salon.
            </h2>
          </div>
        </div>

        <div className="flex flex-col-reverse lg:flex-row gap-12 lg:gap-0 relative items-start">
          
          {/* Left side: Compact Accordion List */}
          <div className="w-full lg:w-1/2 lg:pr-16 xl:pr-24">
            {GALLERY_CONTENT.map((item, index) => {
              const isActive = activeIndex === index;
              return (
                <div 
                  key={item.title} 
                  className="py-5 lg:py-6 border-b border-[#e8e0d4] last:border-b-0 cursor-pointer transition-colors hover:bg-black/5 px-4 -mx-4 rounded-xl"
                  onClick={() => setActiveIndex(index)}
                >
                  <h3 
                    className={cn(
                      "text-[clamp(1.2rem,2vw,1.8rem)] font-bold transition-colors duration-500 font-sans tracking-tight",
                      isActive ? "text-[#1a1a18]" : "text-[#1a1a18]/30"
                    )}
                  >
                    {item.title}
                  </h3>
                  
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="text-[15px] md:text-[16px] text-[#7a7168] leading-[1.6] max-w-[420px]">
                          {item.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right side: Image */}
          <div className="w-full lg:w-1/2 relative lg:pl-16 xl:pl-24 mb-10 lg:mb-0">
            <div className="relative w-full aspect-[4/3] lg:h-[500px] rounded-[24px] overflow-hidden bg-[#FAF7F2]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeIndex}
                  src={GALLERY_CONTENT[activeIndex].image}
                  alt={GALLERY_CONTENT[activeIndex].title}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";

export function SplitVideoAnimation() {
    return (
        <div className="relative w-full aspect-square md:aspect-video bg-transparent flex items-center justify-center p-8">
            {/* Container for the visualization */}
            <div className="relative w-64 h-36 md:w-96 md:h-54 flex items-center justify-center">

                {/* ORIGINAL VIDEO (Wide) */}
                <motion.div
                    initial={{ opacity: 1, scale: 1, width: "100%" }}
                    animate={{
                        opacity: [1, 1, 0, 0],
                        scale: [1, 1, 0.9, 0.9],
                        width: ["100%", "100%", "100%", "100%"]
                    }}
                    transition={{
                        duration: 4,
                        times: [0, 0.4, 0.5, 1],
                        repeat: Infinity,
                        repeatDelay: 1
                    }}
                    className="absolute inset-0 bg-white/5 border border-white/20 flex items-center justify-center z-10"
                >
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">16:9 Source</div>
                    {/* Play Button Icon */}
                    <div className="absolute w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent ml-0.5"></div>
                    </div>
                </motion.div>

                {/* PROCESSED CLIPS (Vertical Split) */}
                <div className="absolute inset-0 flex justify-between gap-2">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, height: "100%", y: 0 }}
                            animate={{
                                opacity: [0, 0, 1, 1],
                                height: ["100%", "100%", "100%", "100%"],
                                y: [20, 20, 0, 0]
                            }}
                            transition={{
                                duration: 4,
                                times: [0, 0.5, 0.6, 1],
                                repeat: Infinity,
                                repeatDelay: 1,
                                delay: i * 0.1 // Stagger effect
                            }}
                            className="flex-1 bg-primary/10 border border-primary/30 flex flex-col items-center justify-center relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-50" />

                            {/* Fake Content Lines */}
                            <div className="w-8 h-0.5 bg-primary/50 mb-1" />
                            <div className="w-6 h-0.5 bg-primary/30" />

                            <div className="absolute bottom-2 text-[8px] uppercase tracking-widest text-primary font-bold">9:16</div>
                        </motion.div>
                    ))}
                </div>

                {/* Processing Beam Scanner effect */}
                <motion.div
                    initial={{ left: "0%", opacity: 0 }}
                    animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                    transition={{
                        duration: 2,
                        times: [0, 1],
                        repeat: Infinity,
                        repeatDelay: 3,
                        ease: "linear"
                    }}
                    className="absolute top-0 bottom-0 w-[2px] bg-primary z-20 shadow-[0_0_15px_rgba(255,77,0,0.8)]"
                />

            </div>
        </div>
    );
}

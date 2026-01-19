"use client";

import React from "react";
import { cn } from "~/lib/utils";

interface SwissGridProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    showLines?: boolean;
}

export function SwissGrid({
    children,
    className,
    showLines = true,
    ...props
}: SwissGridProps) {
    return (
        <div
            className={cn(
                "grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-x-4 md:gap-x-8 w-full max-w-[1400px] mx-auto px-6 md:px-12",
                className
            )}
            {...props}
        >
            {/* Background Grid Lines (Optional) */}
            {showLines && (
                <div className="absolute inset-0 pointer-events-none z-[-1] grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-x-4 md:gap-x-8 max-w-[1400px] mx-auto px-6 md:px-12 opacity-10">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="hidden lg:block border-l border-white/20 h-full first:border-l-0" />
                    ))}
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="hidden md:block lg:hidden border-l border-white/20 h-full first:border-l-0" />
                    ))}
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="block md:hidden border-l border-white/20 h-full first:border-l-0" />
                    ))}
                </div>
            )}

            {children}
        </div>
    );
}

export function SwissSection({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
    return (
        <section
            className={cn("border-t border-white/10 py-12 md:py-24", className)}
            {...props}
        >
            {children}
        </section>
    );
}

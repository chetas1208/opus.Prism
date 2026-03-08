"use client";

import React, { useRef } from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
};

export default function GlowCard({ children, className = "", ...rest }: Props) {
    const ref = useRef<HTMLDivElement | null>(null);

    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        el.style.setProperty("--mx", `${x}%`);
        el.style.setProperty("--my", `${y}%`);
    };

    return (
        <div
            ref={ref}
            className={`glow-card ${className}`}
            onMouseMove={onMove}
            {...rest}
        >
            {children}
        </div>
    );
}

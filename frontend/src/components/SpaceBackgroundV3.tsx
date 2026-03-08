"use client";

import { useEffect, useRef } from "react";

function prefersReducedMotion() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

export default function SpaceBackgroundV3() {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const parallaxRef = useRef<HTMLDivElement | null>(null);

    // Parallax (tiny)
    useEffect(() => {
        if (prefersReducedMotion()) return;

        const onMove = (e: MouseEvent) => {
            const layer = parallaxRef.current;
            if (!layer) return;

            const x = (e.clientX / window.innerWidth - 0.5) * 12;
            const y = (e.clientY / window.innerHeight - 0.5) * 12;
            layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        };

        window.addEventListener("mousemove", onMove, { passive: true });
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    // Shooting stars: first after 5s, then ~5s
    useEffect(() => {
        if (prefersReducedMotion()) return;

        const container = rootRef.current;
        if (!container) return;

        const spawnStar = () => {
            const star = document.createElement("div");
            star.className = "shooting-star";

            const top = Math.random() * 35;  // %
            const left = Math.random() * 35; // %
            const angle = 30 + Math.random() * 30;
            const duration = 0.9 + Math.random() * 1.0;
            const trail = 120 + Math.random() * 150;

            star.style.top = `${top}%`;
            star.style.left = `${left}%`;
            star.style.setProperty("--angle", `${angle}deg`);
            star.style.setProperty("--shoot-duration", `${duration}s`);
            star.style.setProperty("--trail", `${trail}px`);
            star.style.setProperty("--dx", `${110 + Math.random() * 35}vw`);
            star.style.setProperty("--dy", `${110 + Math.random() * 35}vh`);

            container.appendChild(star);
            window.setTimeout(() => star.remove(), Math.ceil(duration * 1000) + 400);
        };

        const first = window.setTimeout(spawnStar, 5000);
        const interval = window.setInterval(() => {
            spawnStar();
            if (Math.random() < 0.15) window.setTimeout(spawnStar, 220); // occasional double
        }, 5000);

        return () => {
            window.clearTimeout(first);
            window.clearInterval(interval);
        };
    }, []);

    return (
        <div ref={rootRef} className="space-bg-v3">
            <div className="star-drift-layer" />
            <div className="space-planet planet-a" />
            <div className="space-planet planet-b" />

            {/* Orbit rings */}
            <div className="space-orbit" />

            {/* Orbiting moon */}
            <div className="orbit-track">
                <div className="orbit-moon" />
            </div>

            {/* Grid */}
            <div className="space-grid-perspective" />

            {/* Parallax sparkles */}
            <div ref={parallaxRef} className="parallax-layer" />
        </div>
    );
}

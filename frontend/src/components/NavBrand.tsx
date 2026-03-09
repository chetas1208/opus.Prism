"use client";

import { usePathname } from "next/navigation";

const MODULE_MAP: Record<string, string> = {
    "/qa": "TextGuard QA",
    "/results": "PersonaCut",
    "/personacut": "PersonaCut",
};

function getModule(pathname: string): string | null {
    for (const [prefix, label] of Object.entries(MODULE_MAP)) {
        if (pathname.startsWith(prefix)) return label;
    }
    return null; // landing page — no module subtitle
}

export default function NavBrand() {
    const pathname = usePathname();
    const module = getModule(pathname);

    return (
        <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
                Opus.Prism
            </span>
            {module && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted/70">
                    {module}
                </span>
            )}
        </div>
    );
}

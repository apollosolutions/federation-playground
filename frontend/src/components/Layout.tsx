import { useCallback, useRef, useState, type ReactNode } from "react";

export type LayoutProps = {
    topLeft: ReactNode;
    topRight: ReactNode;
    bottomLeft: ReactNode;
    bottomRight: ReactNode;
};

const MIN_PX = 120;

export function Layout({ topLeft, topRight, bottomLeft, bottomRight }: LayoutProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [rowTopFrac, setRowTopFrac] = useState(0.52);
    const [colTopFrac, setColTopFrac] = useState(0.5);
    const [colBottomFrac, setColBottomFrac] = useState(0.5);

    const dragRef = useRef<{
        kind: "row" | "colTop" | "colBottom";
        start: number;
        startFrac: number;
        size: number;
    } | null>(null);

    const onRowMove = useCallback((e: MouseEvent) => {
        const d = dragRef.current;
        const el = containerRef.current;
        if (!d || d.kind !== "row" || !el) return;
        const rect = el.getBoundingClientRect();
        const h = rect.height;
        const dy = e.clientY - d.start;
        let next = d.startFrac + dy / h;
        const minF = MIN_PX / h;
        const maxF = 1 - minF;
        next = Math.min(maxF, Math.max(minF, next));
        setRowTopFrac(next);
    }, []);

    const onColTopMove = useCallback((e: MouseEvent) => {
        const d = dragRef.current;
        const el = containerRef.current;
        if (!d || d.kind !== "colTop" || !el) return;
        const rect = el.getBoundingClientRect();
        const rowH = rect.height * rowTopFrac;
        const dx = e.clientX - d.start;
        let next = d.startFrac + dx / rowH;
        const minF = MIN_PX / rowH;
        const maxF = 1 - minF;
        next = Math.min(maxF, Math.max(minF, next));
        setColTopFrac(next);
    }, [rowTopFrac]);

    const onColBottomMove = useCallback((e: MouseEvent) => {
        const d = dragRef.current;
        const el = containerRef.current;
        if (!d || d.kind !== "colBottom" || !el) return;
        const rect = el.getBoundingClientRect();
        const rowH = rect.height * (1 - rowTopFrac);
        const dx = e.clientX - d.start;
        let next = d.startFrac + dx / rowH;
        const minF = MIN_PX / rowH;
        const maxF = 1 - minF;
        next = Math.min(maxF, Math.max(minF, next));
        setColBottomFrac(next);
    }, [rowTopFrac]);

    const endDrag = useCallback(() => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onRowMove);
        window.removeEventListener("mousemove", onColTopMove);
        window.removeEventListener("mousemove", onColBottomMove);
        window.removeEventListener("mouseup", endDrag);
    }, [onRowMove, onColTopMove, onColBottomMove]);

    const startRowDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = {
            kind: "row",
            start: e.clientY,
            startFrac: rowTopFrac,
            size: 0,
        };
        window.addEventListener("mousemove", onRowMove);
        window.addEventListener("mouseup", endDrag);
    };

    const startColTopDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = {
            kind: "colTop",
            start: e.clientX,
            startFrac: colTopFrac,
            size: 0,
        };
        window.addEventListener("mousemove", onColTopMove);
        window.addEventListener("mouseup", endDrag);
    };

    const startColBottomDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = {
            kind: "colBottom",
            start: e.clientX,
            startFrac: colBottomFrac,
            size: 0,
        };
        window.addEventListener("mousemove", onColBottomMove);
        window.addEventListener("mouseup", endDrag);
    };

    return (
        <div
            ref={containerRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
            <div
                className="flex min-h-0"
                style={{ flex: `${rowTopFrac}`, flexBasis: 0 }}
            >
                <div
                    className="flex min-h-0 min-w-0"
                    style={{ flex: `${colTopFrac}`, flexBasis: 0 }}
                >
                    {topLeft}
                </div>
                <div
                    role="separator"
                    aria-orientation="vertical"
                    className="w-1 shrink-0 cursor-col-resize bg-surface-border hover:bg-blue-900/40"
                    onMouseDown={startColTopDrag}
                />
                <div
                    className="flex min-h-0 min-w-0"
                    style={{ flex: `${1 - colTopFrac}`, flexBasis: 0 }}
                >
                    {topRight}
                </div>
            </div>
            <div
                role="separator"
                aria-orientation="horizontal"
                className="h-1 shrink-0 cursor-row-resize bg-surface-border hover:bg-blue-900/40"
                onMouseDown={startRowDrag}
            />
            <div
                className="flex min-h-0"
                style={{ flex: `${1 - rowTopFrac}`, flexBasis: 0 }}
            >
                <div
                    className="flex min-h-0 min-w-0"
                    style={{ flex: `${colBottomFrac}`, flexBasis: 0 }}
                >
                    {bottomLeft}
                </div>
                <div
                    role="separator"
                    aria-orientation="vertical"
                    className="w-1 shrink-0 cursor-col-resize bg-surface-border hover:bg-blue-900/40"
                    onMouseDown={startColBottomDrag}
                />
                <div
                    className="flex min-h-0 min-w-0"
                    style={{ flex: `${1 - colBottomFrac}`, flexBasis: 0 }}
                >
                    {bottomRight}
                </div>
            </div>
        </div>
    );
}

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { renderMandala } from "../../mandala/renderer/mandalaRenderer.js";
import { buildThemeVars } from "../../data/themeData";
import "../../mandala/assets/styles/styles.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = any;

export interface MandalaCanvasHandle {
  /** Update completion states without re-rendering geometry */
  updateCompletions: (completions: ApiResponse) => void;
  /** Swap theme — applies new CSS custom properties */
  setTheme: (variables: Record<string, string>) => void;
  /** Swap the center figure emoji */
  setFigure: (emoji: string) => void;
}

interface MandalaCanvasProps {
  apiResponse: ApiResponse | null;
  className?: string;
  themeId: string;
  colorId: string;
  figure: string;
}

const MandalaCanvas = forwardRef<MandalaCanvasHandle, MandalaCanvasProps>(
  function MandalaCanvas(
    { apiResponse, className, themeId, colorId, figure },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rendererRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      updateCompletions(completions: ApiResponse) {
        rendererRef.current?.updateCompletions(completions);
      },
      setTheme(variables: Record<string, string>) {
        rendererRef.current?.setTheme(variables);
      },
      setFigure(emoji: string) {
        rendererRef.current?.setFigure(emoji);
      },
    }));

    // Initial render (re-runs only when apiResponse changes)
    useEffect(() => {
      if (!containerRef.current || !apiResponse) return;

      // Clean previous render
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }

      rendererRef.current = renderMandala(containerRef.current, apiResponse);

      // Apply selected theme + figure immediately after render
      rendererRef.current.setTheme(buildThemeVars(themeId, colorId));
      rendererRef.current.setFigure(figure);

      return () => {
        if (rendererRef.current) {
          rendererRef.current.destroy();
          rendererRef.current = null;
        }
      };
      // themeId/colorId/figure intentionally omitted — handled by dedicated effects below
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiResponse]);

    // React to theme / petal color changes
    useEffect(() => {
      if (!rendererRef.current) return;
      rendererRef.current.setTheme(buildThemeVars(themeId, colorId));
    }, [themeId, colorId]);

    // React to figure changes
    useEffect(() => {
      if (!rendererRef.current) return;
      rendererRef.current.setFigure(figure);
    }, [figure]);

    return <div ref={containerRef} className={className} />;
  },
);

export default MandalaCanvas;

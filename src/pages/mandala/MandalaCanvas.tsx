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
  /** Re-run the entrance animation without rebuilding the mandala */
  replayEntrance: (overrides?: Record<string, unknown>) => void;
  /** Cycle entrance and exit until stopped */
  startLoop: (overrides?: Record<string, unknown>) => void;
  /** Stop a running loop */
  stopLoop: () => void;
}

interface MandalaCanvasProps {
  apiResponse: ApiResponse | null;
  className?: string;
  themeId: string;
  colorId: string;
  figure: string;
  /** Dev preview: synthesise text on the month petals so folding can be judged */
  previewLabels?: boolean;
  /**
   * Fold overrides for the entrance played on mount.
   *
   * Read once, when the mandala is built. Later changes go through
   * replayEntrance rather than rebuilding, so this is not a dependency of the
   * render effect -- see the note there.
   */
  entrance?: Record<string, unknown>;
}

const MandalaCanvas = forwardRef<MandalaCanvasHandle, MandalaCanvasProps>(
  function MandalaCanvas(
    { apiResponse, className, themeId, colorId, figure, previewLabels, entrance },
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
      replayEntrance(overrides?: Record<string, unknown>) {
        rendererRef.current?.replayEntrance(overrides);
      },
      startLoop(overrides?: Record<string, unknown>) {
        rendererRef.current?.startLoop(overrides);
      },
      stopLoop() {
        rendererRef.current?.stopLoop();
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

      rendererRef.current = renderMandala(containerRef.current, apiResponse, {
        previewLabels,
        entrance,
      });

      // Apply selected theme + figure immediately after render
      rendererRef.current.setTheme(buildThemeVars(themeId, colorId));
      rendererRef.current.setFigure(figure);

      return () => {
        if (rendererRef.current) {
          rendererRef.current.destroy();
          rendererRef.current = null;
        }
      };
      // themeId/colorId/figure intentionally omitted — handled by dedicated effects below.
      // previewLabels IS a dependency: it changes what gets built, so toggling
      // it has to rebuild the mandala rather than restyle it.
      // entrance is NOT: it only decides how the first entrance plays, and
      // rebuilding the whole mandala to change a fold setting would throw away
      // every completion state and interaction binding to restart an animation
      // replayEntrance can restart on its own.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiResponse, previewLabels]);

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

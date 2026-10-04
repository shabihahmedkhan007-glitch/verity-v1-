import type { CanvasSlice } from "./slices/canvas";
import type { LiveSlice } from "./slices/live";
import type { PlaybackSlice } from "./slices/playback";
import type { RunSlice } from "./slices/run";
import type { UiSlice } from "./slices/ui";

/** The whole module-level store: one object, five slices (ARCHITECTURE 7). */
export type Store = RunSlice & CanvasSlice & PlaybackSlice & UiSlice & LiveSlice;

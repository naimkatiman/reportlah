export {};

declare global {
  interface Window {
    /** Set to true once a shot preset has fonts loaded and (for 3D) a rendered frame. */
    __SHOT_READY?: boolean;
  }
}

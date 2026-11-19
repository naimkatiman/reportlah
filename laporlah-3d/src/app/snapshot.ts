import { mountWalk } from '../scene';

const WIDTH = 960;
const HEIGHT = 600;

/**
 * Renders the drain view once, off screen and with every clock pinned, and returns it as a data URL.
 * Used by shot presets, which need the frozen snapshot without walking there first.
 */
export function captureDrainSnapshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;height:${HEIGHT}px;pointer-events:none;`;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;';
    host.appendChild(canvas);
    document.body.appendChild(host);

    let handle: ReturnType<typeof mountWalk> | null = null;
    const finish = (url: string | Error): void => {
      handle?.dispose();
      host.remove();
      if (typeof url === 'string') resolve(url);
      else reject(url);
    };
    try {
      handle = mountWalk(canvas, {
        pinTime: 0,
        initialPose: 'drain',
        onReady: () => {
          try {
            finish(handle ? handle.snap() : '');
          } catch (error) {
            finish(error instanceof Error ? error : new Error(String(error)));
          }
        },
      });
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

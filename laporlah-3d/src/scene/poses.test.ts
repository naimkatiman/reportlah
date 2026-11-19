import { describe, expect, it } from 'vitest';
import { EYE_Y, POSES, POSE_NAMES, forwardVector, isLookingAtDrain, poseAt, tOfPose } from './poses';
import type { PoseName } from './poses';

function looking(name: PoseName, yawOffset = 0): boolean {
  const pose = POSES[name];
  return isLookingAtDrain({ x: pose.x, y: EYE_Y, z: pose.z }, pose.yaw + yawOffset, pose.pitch);
}

describe('walk poses', () => {
  it('poseAt hits the named waypoints at their t', () => {
    for (const name of POSE_NAMES) {
      const pose = poseAt(tOfPose(name));
      expect(pose.x).toBeCloseTo(POSES[name].x);
      expect(pose.z).toBeCloseTo(POSES[name].z);
      expect(pose.yaw).toBeCloseTo(POSES[name].yaw);
    }
    expect(tOfPose('street')).toBe(0);
    expect(tOfPose('drain')).toBe(1);
  });

  it('moves forward monotonically along the street', () => {
    let previous = -Infinity;
    for (let i = 0; i <= 20; i += 1) {
      const x = poseAt(i / 20).x;
      expect(x).toBeGreaterThanOrEqual(previous);
      previous = x;
    }
  });

  it('clamps t outside 0..1', () => {
    expect(poseAt(-3)).toEqual(poseAt(0));
    expect(poseAt(4)).toEqual(poseAt(1));
  });

  it('forward vector is unit length', () => {
    const f = forwardVector(0.7, -0.3);
    expect(Math.hypot(f.x, f.y, f.z)).toBeCloseTo(1);
  });

  it('is looking at the drain only at the drain waypoint', () => {
    expect(looking('drain')).toBe(true);
    expect(looking('street')).toBe(false);
    expect(looking('bus-stop')).toBe(false);
    expect(looking('approach')).toBe(false);
  });

  it('looks away from the drain when dragged far off', () => {
    expect(looking('drain', 0.2)).toBe(true);
    expect(looking('drain', 1.2)).toBe(false);
    expect(looking('drain', -1.2)).toBe(false);
  });
});

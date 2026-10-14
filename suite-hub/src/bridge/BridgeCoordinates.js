// Pure coordinates are shared by the lightweight drawing and the 3D scene.
export const ROAD_HALF_WIDTH = 1.9;
export const CAR_LANE = .95;
export const deckCoordinates = (x, z = 0, offset = 0) =>
  [x, 5.4 + x * .008 + offset, z + .3 * Math.sin(x * .05)];

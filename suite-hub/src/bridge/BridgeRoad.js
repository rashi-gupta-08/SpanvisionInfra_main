import * as THREE from 'three';
import {deckCoordinates,CAR_LANE} from './BridgeCoordinates.js';

export {ROAD_HALF_WIDTH,CAR_LANE} from './BridgeCoordinates.js';
export const deckPoint = (x, z = 0, offset = 0) => new THREE.Vector3(...deckCoordinates(x,z,offset));

export function createDrivingRoute(lane = CAR_LANE, reverse = false) {
  const points = [];
  for (let x = -40; x <= 40; x += 5) points.push(deckPoint(x, lane, .06));
  if (reverse) points.reverse();
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  curve.arcLengthDivisions = 600;
  curve.updateArcLengths();
  return curve;
}

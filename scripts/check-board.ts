/** Print the obstacle field's pinch points, shallow surfaces, exposed balance points and key heights. */
import { BOARD_LAYOUT as L } from "../lib/physics/board-layout";
import { exposedBalancePoints, findPinchPoints, shallowSurfaces } from "../lib/physics/clearance";
import { spawnZone } from "../lib/physics/spawn";
const zone = spawnZone(L);
console.log({ fieldTop: L.fieldTop, fieldBottom: L.fieldBottom, dividerTop: L.dividerTop, slotDepth: L.floorY - L.dividerTop, spawn: zone });
console.log("pinch points:", findPinchPoints(L));
console.log("shallow:", shallowSurfaces(L));
console.log("exposed balance points:", exposedBalancePoints(L, { columns: L.slots.map((s) => s.centerX), xJitter: zone.xJitter, yMax: zone.yMax }));

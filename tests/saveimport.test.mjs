// Run with: node tests/saveimport.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import map_sc2 from "../src/data/map_sc2.js";
import nodeData from "../src/data/starmap-nodedata.js";
import { parseVanillaSave, applySaveToStarmap, clearImportedSave } from "../src/saveimport.js";

function starAt(starmap, ux, uy) {
  for (const constellation of starmap) {
    for (const star of constellation.stars) {
      if (Math.round(star.x * 10) === ux && Math.round(star.y * 10) === uy) {
        return star;
      }
    }
  }
  throw new Error("star not found: " + ux + "," + uy);
}

const save = fs.readFileSync(new URL("./fixtures/visited-save.sav", import.meta.url));
const scans = parseVanillaSave(save);
assert.equal(scans.filter(Boolean).length, 3, "three star systems have scan records");

const result = applySaveToStarmap(map_sc2, scans);
assert.equal(result.matchedStars, 3);
assert.equal(result.visited.size, 3);
assert.equal(result.updatedStars, 2);

// Fully mined: every mineral/bio bit set on every body.
const serpentis = starAt(map_sc2, 5007, 35);
assert.equal(serpentis.planetsInfo.MinValue, 0);
assert.equal(serpentis.planetsInfo.BioUnits, 0);
assert.equal(serpentis.planetsInfo.MinVolume, 0);
assert.equal(Object.values(serpentis.planets)[0].MinValue, "0");

// Partially mined: first three mineral nodes on Andromedae I, and all bio on V-a.
const andromedae = starAt(map_sc2, 8625, 7000);
assert.equal(andromedae.planets.I.MinValue, "767");
assert.equal(andromedae.planets["V-a"].BioUnits, "0");
assert.equal(andromedae.planetsInfo.MinValue, 3973);
assert.equal(andromedae.planetsInfo.BioUnits, 15);
assert.equal(andromedae.planets.I.MinVolume, "129");
assert.equal(andromedae.planetsInfo.MinVolume, 840);
assert.ok(result.visited.has(andromedae));

// Sol only had an energy/artifact bit set: visited but resources untouched.
const sol = starAt(map_sc2, 1752, 1450);
assert.equal(sol.planetsInfo.MinValue, 4008);
assert.equal(sol.planetsInfo.BioUnits, 0);
assert.equal(sol.planets.Mercury.MinValue, "1060");
assert.ok(result.visited.has(sol));

// Fully mine every body in the universe: every star must end at zero.
const everything = nodeData.map(function (star) {
  return star[2].map(function () {
    return { mineral: 0xFFFFFFFF, energy: 0xFFFFFFFF, biological: 0xFFFFFFFF };
  });
});
const allResult = applySaveToStarmap(map_sc2, everything);
assert.equal(allResult.visited.size, 502);
for (const constellation of map_sc2) {
  for (const star of constellation.stars) {
    assert.equal(star.planetsInfo.MinValue, 0, "minerals left at " + constellation.name);
    assert.equal(star.planetsInfo.BioUnits, 0, "bio left at " + constellation.name);
    assert.equal(star.planetsInfo.MinVolume, 0, "volume left at " + constellation.name);
  }
}

// Upper-half energy bits are special-world ruin visit markers, not
// artifacts, and must not mark a star as visited on their own.
const upperOnly = new Array(502).fill(null);
upperOnly[1] = nodeData[1][2].map(function () {
  return { mineral: 0, energy: 0x10000, biological: 0 };
});
const upperResult = applySaveToStarmap(map_sc2, upperOnly);
assert.equal(upperResult.visited.size, 0);
assert.equal(upperResult.updatedStars, 0);

clearImportedSave(map_sc2);
assert.equal(andromedae.planetsInfo.MinValue, 4317);
assert.equal(andromedae.planetsInfo.BioUnits, 46);
assert.equal(andromedae.planets.I.MinValue, "1111");
assert.equal(andromedae.planets["V-a"].BioUnits, "31");
assert.equal(andromedae.planetsInfo.MinVolume, 898);

assert.throws(() => parseVanillaSave(Buffer.from("MMV4notvanilla")),
  /Only vanilla UQM saves/);
assert.throws(() => parseVanillaSave(Buffer.from("UMS\\x01Summ")),
  /too short|truncated|no scan table/);

console.log("save import tests passed");

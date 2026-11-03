// Import a vanilla UQM (The Ur-Quan Masters) save game.
//
// The save format is the vanilla "UMS\x01" chunked format. Project 6014,
// UQM-HD and MegaMod saves use different headers/record sizes and are
// deliberately rejected here.
//
// The only part of the save we need is the SCAN_TAG chunk. It contains a
// table of 502 DWORD offsets (one per star system, in starmap_array order)
// followed by 12-byte scan records: three little-endian DWORD
// ScanRetrieveMask values in the order MINERAL, ENERGY, BIOLOGICAL.
// A set bit means the corresponding surface deposit was retrieved.
//
// Per-deposit values are not stored in a vanilla save (only the bit is),
// so starmap-nodedata.js contains the values the game's own planet
// generator produces for every deposit.  That lets us subtract exactly
// what was mined instead of guessing.

import nodeData from "./data/starmap-nodedata.js?v=1.13";

const SAVE_MAGIC = 0x01534d55; // "UMS\x01"
const SCAN_TAG = 0x6e616353; // "Scan"
const NUM_STARS = 502;
const SCAN_TABLE_SIZE = NUM_STARS * 4;
const CORE_SCAN_RECORD_SIZE = 12; // 3 * DWORD

function readU32(bytes, offset) {
    return (bytes[offset]
        | (bytes[offset + 1] << 8)
        | (bytes[offset + 2] << 16)
        | (bytes[offset + 3] << 24)) >>> 0;
}

function parseValues(value) {
    if (!value) {
        return [];
    }
    return value.split(",").map(function (part) {
        return parseInt(part, 10) || 0;
    });
}

function coordinateKey(x, y) {
    return Math.round(x) + "," + Math.round(y);
}

// A save's scan table is indexed by starmap_array order.  Build a lookup
// from that order to the starmap dataset's stars using their coordinates.
function buildStarLookup(starmapdata) {
    const lookup = new Map();
    for (const constellation of starmapdata) {
        for (const star of constellation.stars) {
            lookup.set(coordinateKey(star.x * 10, star.y * 10), star);
        }
    }
    return lookup;
}

// Returns an array of { mineral, energy, biological } records per star
// index, or null when the table entry is empty.
export function parseVanillaSave(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 12) {
        throw new Error("File is too short to be a UQM save.");
    }

    const magic = readU32(bytes, 0);
    if (magic !== SAVE_MAGIC) {
        const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
        if (header === "MMV3" || header === "MMV4" || header === "MEGA") {
            throw new Error("This is a Project 6014 / UQM-HD / MegaMod save. Only vanilla UQM saves are supported.");
        }
        throw new Error("This is not a vanilla UQM save (missing UMS header).");
    }

    let offset = 4;
    let scanData = null;
    while (offset + 8 <= bytes.length) {
        const tag = readU32(bytes, offset);
        const size = readU32(bytes, offset + 4);
        const dataStart = offset + 8;
        if (dataStart + size > bytes.length) {
            throw new Error("Save file is truncated or corrupt.");
        }
        if (tag === SCAN_TAG) {
            scanData = bytes.subarray(dataStart, dataStart + size);
            break;
        }
        offset = dataStart + size;
    }

    if (!scanData || scanData.length < SCAN_TABLE_SIZE) {
        throw new Error("This save has no scan table; it may predate the first planet landing.");
    }

    const recordBytes = scanData.length - SCAN_TABLE_SIZE;
    if (recordBytes % CORE_SCAN_RECORD_SIZE !== 0) {
        throw new Error("Unrecognised scan record size; only vanilla UQM saves are supported.");
    }

    const scans = new Array(NUM_STARS).fill(null);
    for (let starIndex = 0; starIndex < NUM_STARS; starIndex++) {
        const starOffset = readU32(scanData, starIndex * 4);
        if (starOffset === 0) {
            continue;
        }
        if (starOffset < SCAN_TABLE_SIZE || starOffset >= scanData.length) {
            throw new Error("Save scan table contains an invalid offset.");
        }
        const bodyCount = nodeData[starIndex] ? nodeData[starIndex][2].length : 0;
        if (bodyCount === 0) {
            continue;
        }
        if (starOffset + bodyCount * CORE_SCAN_RECORD_SIZE > scanData.length) {
            throw new Error("Save scan table points outside the scan records.");
        }
        const records = [];
        for (let body = 0; body < bodyCount; body++) {
            const record = starOffset + body * CORE_SCAN_RECORD_SIZE;
            records.push({
                mineral: readU32(scanData, record),
                energy: readU32(scanData, record + 4),
                biological: readU32(scanData, record + 8)
            });
        }
        scans[starIndex] = records;
    }
    return scans;
}

let backup = null;

function snapshot(starmapdata) {
    backup = {
        planets: new Map(),
        stars: new Map()
    };
    for (const constellation of starmapdata) {
        for (const star of constellation.stars) {
            if (star.planetsInfo) {
                backup.stars.set(star, {
                    MinValue: star.planetsInfo.MinValue,
                    BioUnits: star.planetsInfo.BioUnits,
                    MinVolume: star.planetsInfo.MinVolume
                });
            }
            for (const planet of Object.values(star.planets)) {
                backup.planets.set(planet, {
                    MinValue: planet.MinValue,
                    BioUnits: planet.BioUnits,
                    MinVolume: planet.MinVolume
                });
            }
        }
    }
}

function restoreValues() {
    if (!backup) {
        return;
    }
    for (const [planet, values] of backup.planets) {
        planet.MinValue = values.MinValue;
        planet.BioUnits = values.BioUnits;
        planet.MinVolume = values.MinVolume;
    }
    for (const [star, values] of backup.stars) {
        if (star.planetsInfo) {
            star.planetsInfo.MinValue = values.MinValue;
            star.planetsInfo.BioUnits = values.BioUnits;
            star.planetsInfo.MinVolume = values.MinVolume;
        }
    }
}

function popcount(value) {
    let count = 0;
    while (value !== 0) {
        count += value & 1;
        value >>>= 1;
    }
    return count;
}

function remainingValue(total, weights, mask) {
    total = parseInt(total, 10) || 0;
    if (total === 0) {
        return 0;
    }
    if (weights.length === 0) {
        // A few special worlds (for example the Pkunk homeworld) have
        // bio/mineral totals in the older starmap data but no generated
        // deposits in UQM 0.8.  Fall back to an even split across the
        // recorded bits so that a fully collected world still reports 0.
        if (mask === 0) {
            return total;
        }
        let highest = 0;
        for (let i = 0; i < 32; i++) {
            if (mask & (1 << i)) {
                highest = i;
            }
        }
        const nodes = highest + 1;
        const retrieved = popcount(mask);
        return Math.max(0, Math.round(total * (nodes - retrieved) / nodes));
    }
    let totalWeight = 0;
    let remainingWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        totalWeight += weights[i];
        if ((mask & (1 << i)) === 0) {
            remainingWeight += weights[i];
        }
    }
    if (totalWeight === 0 || remainingWeight === totalWeight) {
        return total;
    }
    return Math.round(total * remainingWeight / totalWeight);
}

// Applies parsed scan masks to the SC2 starmap.  Returns the set of star
// objects that have had something retrieved from at least one body.
export function applySaveToStarmap(starmapdata, scans) {
    if (!backup) {
        snapshot(starmapdata);
    } else {
        restoreValues();
    }

    const lookup = buildStarLookup(starmapdata);
    const visited = new Set();
    const deltas = new Map();
    let matchedStars = 0;

    for (let starIndex = 0; starIndex < scans.length; starIndex++) {
        const records = scans[starIndex];
        if (!records) {
            continue;
        }
        const starData = nodeData[starIndex];
        const star = lookup.get(coordinateKey(starData[0], starData[1]));
        if (!star) {
            continue;
        }
        matchedStars++;
        const bodies = starData[2];
        const planets = Object.values(star.planets);
        const bodyCount = Math.min(records.length, bodies.length, planets.length);
        const delta = { min: 0, bio: 0, volume: 0 };
        let starVisited = false;

        for (let body = 0; body < bodyCount; body++) {
            const planet = planets[body];
            const record = records[body];
            const weights = bodies[body];
            const mineralMask = record.mineral;
            const energyMask = record.energy;
            const bioMask = record.biological;

            // The upper 16 energy bits are used by a few special worlds
            // (for example the Androsynth ruins) to remember visited ruin
            // reports.  They are not artifact pickups, so only count the
            // lower 16 bits as evidence of a retrieved artifact/device.
            const artifactMask = energyMask & 0xFFFF;
            if ((mineralMask | artifactMask | bioMask) !== 0) {
                starVisited = true;
            }

            if ((mineralMask | bioMask) !== 0) {
                const oldMin = parseInt(planet.MinValue, 10) || 0;
                const oldBio = parseInt(planet.BioUnits, 10) || 0;
                const oldVolume = parseInt(planet.MinVolume, 10) || 0;
                const newMin = remainingValue(oldMin, parseValues(weights[1]), mineralMask);
                const newBio = remainingValue(oldBio, parseValues(weights[2]), bioMask);
                const newVolume = oldMin > 0
                    ? Math.round(oldVolume * newMin / oldMin)
                    : oldVolume;
                if (newMin !== oldMin || newBio !== oldBio || newVolume !== oldVolume) {
                    planet.MinValue = String(newMin);
                    planet.BioUnits = String(newBio);
                    planet.MinVolume = String(newVolume);
                    delta.min += oldMin - newMin;
                    delta.bio += oldBio - newBio;
                    delta.volume += oldVolume - newVolume;
                }
            }
        }

        if (starVisited) {
            visited.add(star);
        }
        if (delta.min !== 0 || delta.bio !== 0 || delta.volume !== 0) {
            deltas.set(star, delta);
        }
    }

    for (const [star, delta] of deltas) {
        const original = backup.stars.get(star);
        if (original) {
            star.planetsInfo.MinValue = Math.max(0,
                (parseInt(original.MinValue, 10) || 0) - delta.min);
            star.planetsInfo.BioUnits = Math.max(0,
                (parseInt(original.BioUnits, 10) || 0) - delta.bio);
            star.planetsInfo.MinVolume = Math.max(0,
                (parseInt(original.MinVolume, 10) || 0) - delta.volume);
        }
    }

    return {
        visited: visited,
        matchedStars: matchedStars,
        updatedStars: deltas.size
    };
}

export function clearImportedSave(starmapdata) {
    restoreValues();
    backup = null;
}

export function hasImportedSave() {
    return backup !== null;
}

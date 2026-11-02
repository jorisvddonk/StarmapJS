import { mindata_mapping, biodata_mapping } from "./data/starmap-colormapping.js?v=1.12";

export function convertPrefix(prefix) {
  //Converts a 'prefix' ('A', 'B') to a proper name ("Alpha", "Beta")
  //alpha, beta, gamma, delta, epsilon, zeta, eta, theta, iota, kappa, lambda, mu, nu, xi, omicron, pi, rho, sigma, tau, upsilon, phi, chi, psi, omega
  switch (prefix.toLowerCase()) {
    case "a":
      return "Alpha";
    case "b":
      return "Beta";
    case "c":
      return "Gamma";
    case "d":
      return "Delta";
    case "e":
      return "Epsilon";
    case "f":
      return "Zeta";
    case "g":
      return "Eta";
    case "h":
      return "Theta";
    case "i":
      return "Iota";
    case "j":
      return "Kappa"; //This isn't wrong, no.
    case "k":
      return "Lambda";
    case "l":
      return "Mu";
    case "m":
      return "Nu";
    case "n":
      return "Xi";
    case "o":
      return "Omicron";
    case "p":
      return "Pi";
    case "q":
      return "Rho";
    case "r":
      return "Sigma";
    case "s":
      return "Tau";
    case "t":
      return "Upsilon";
    case "u":
      return "Phi";
    case "*":
      return "Prime";
    default:
      return "UNKNOWN";
  }
}


export const starColors = {
  "blue": "#1464FF",
  "orange": "#FF6400",
  "green": "#00C800",
  "red": "#FF0000",
  "white": "#C8EBEB",
  "gray": "#C8EBEB",
  "yellow": "#FFFF00",
  "cyan": "#00FFFF",
  "purple": "#800080",
  "violet": "#7F00FF",
}
export function getStarColor_normal(star) {
  const color = starColors[(star.color || "").toLowerCase()];
  return color !== undefined ? color : "#BEBEBE";
}

function getPlanetTotal(star, field) {
  //Fall back to summing the planets for maps without a planetsInfo summary:
  let total = 0;
  if (star.planets !== undefined) {
    for (const planetI in star.planets) {
      const value = parseInt(star.planets[planetI][field]);
      if (!isNaN(value)) {
        total += value;
      }
    }
  }
  return total;
}

export function getStarColor_mineralData(star) {
  const rvalue = star.planetsInfo !== undefined && star.planetsInfo.MinValue !== undefined
    ? parseInt(star.planetsInfo.MinValue)
    : getPlanetTotal(star, "MinValue");
  return getColor_FromMapping(rvalue, mindata_mapping);
}

function getColor_FromMapping(value, mapping) {
  value = parseInt(value);
  if (isNaN(value)) {
    return "#BEBEBE";
  }
  for (const m in mapping) {
    const cmap = mapping[m];
    if (value >= cmap.min && value <= cmap.max) {
      return cmap.color;
    }
  }
  //Clamp values outside the mapping to the closest bucket.
  if (mapping.length > 0) {
    if (value < mapping[0].min) {
      return mapping[0].color;
    }
    const last = mapping[mapping.length - 1];
    if (value > last.max) {
      return last.color;
    }
  }
  console.log("Error: VALUE IS " + value + ", no color data mapped in " + mapping);
  return "#BEBEBE";
}

export function getStarColor_bioData(star) {
  const rvalue = star.planetsInfo !== undefined && star.planetsInfo.BioUnits !== undefined
    ? parseInt(star.planetsInfo.BioUnits)
    : getPlanetTotal(star, "BioUnits");
  return getColor_FromMapping(rvalue, biodata_mapping);
}
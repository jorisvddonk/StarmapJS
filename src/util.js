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


const starColors = {
  "blue": "#1464FF",
  "orange": "#FF6400",
  "green": "#00C800",
  "red": "#f00",
  "white": "#C8EBEB",
  "gray": "#C8EBEB",
  "yellow": "#ff0",
  "cyan": "#0ff",
  "purple": "#800080",
  "violet": "#7F00FF",
}
export function getStarColor_normal(star) {
  return starColors[star.color.toLowerCase()];
}
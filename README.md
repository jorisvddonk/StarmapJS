# StarmapJS

This is a fairly well-featured SVG starmap for [The Ur-Quan Masters](http://sc2.sourceforge.net/) and Project 6014.

As this was written a _long_ time ago, the code is rather horrible. Have fun! ;)

The tool is available [here (GitHub Pages; tracks the master branch of this repo)](https://jorisvddonk.github.io/StarmapJS/) as well as [here (raw.githack.com; version that tracks the master branch of this repo)](https://raw.githack.com/jorisvddonk/StarmapJS/master/src/index.html) and [here (mooses.nl; older version)](http://mooses.nl/uqm/wip/js-starmap/).

## How to run locally

Simply clone this repo, then run a webserver locally from within the `src` folder, e.g. via:

```bash
cd src
npx http-server -c-1 -p 8081
```

## Changelog

## 1.09

Project 6014's star colouring (truespace colours, mineral value and bio data) and star highlighting (rainbow worlds, homeworlds and devices) now work with data extracted from the Project 6014 game itself. Per-planet mineral and bio values were regenerated with a new `P6014_STARMAP_DUMP` mode in the game's source, and the colour legends got extra buckets for Project 6014's higher values. Because Project 6014 is set after Star Control 2, the already-acquired Taalo Shield and Shofixti Maidens are not marked as devices on the Project 6014 map; the Black Orb at the Shofixti crash site is.

## 1.08

The Project 6014 starmap now has its own Sphere of Influence selections: the official spoiler-free map (matching Project 6014's downloadable starmap) and an "ultimate spoilers" map showing every sphere of influence in Project 6014's galaxy, including the Lurg, Pkunk and Ilwrath. The data is taken from the Project 6014 game source and its starmap generator configuration.

## 1.07

If no biological hazard data is available for a planet (because there are no biological signs at all), a grey '-' label is now shown, instead of nothing.

### 1.06

?
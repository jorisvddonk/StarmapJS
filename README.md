# StarmapJS

This is a fairly well-featured SVG starmap for [The Ur-Quan Masters](http://sc2.sourceforge.net/) and Project 6014.

As this was written a _long_ time ago, the code is rather horrible. Have fun! ;)

The tool is available [here (raw.githack.com; version that tracks the master branch of this repo)](https://raw.githack.com/jorisvddonk/StarmapJS/master/index.html) as well as [here (mooses.nl; older version)](http://mooses.nl/uqm/wip/js-starmap/).

## How to run locally

Simply clone this repo, then run a webserver locally from within the `src` folder, e.g. via:

```bash
cd src
npx http-server -c-1 -p 8081
```

## Changelog

## 1.07

If no biological hazard data is available for a planet (because there are no biological signs at all), a grey '-' label is now shown, instead of nothing.

### 1.06

?
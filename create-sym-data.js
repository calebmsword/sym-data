import fs from "node:fs";
import jsdom from "jsdom";
import { prettifySymData, prune, write } from "./utils.js";

const { JSDOM } = jsdom;

export const symData = {};

// read the HTML file
fs.readFile("./Sym.html", "utf8", (error, data) => {
  if (error) {
    console.log(error);
    return;
  }

  const { document } = new JSDOM(data).window;

  // iterate over all weapon classes (assault, medic, support, scout, sidearm,
  // misc)
  const weaponClasses = document.querySelectorAll(".sortableTable");
  for (let classIndex = 0; classIndex < weaponClasses.length; classIndex++) {
    // iterate over every weapon in the weapon class
    const weapons = weaponClasses[classIndex].children;
    for (let weaponIndex = 0; weaponIndex < weapons.length; weaponIndex++) {
      /**
       * Finds a descendent element by classname and gets its pruned text
       * context as a number or string.
       * @param {string} className
       * The class of the element to find.
       * @param {{ keepSpaces: boolean, asString: boolean }} opts
       * Configuration object to pass to {@link prune}.
       * @returns {number|string|undefined}
       */
      const getValue = (className, opts) => {
        return prune(
          weapons[weaponIndex]
            ?.querySelector("." + className)
            ?.textContent,
          opts,
        );
      };

      /**
       * Finds a descendent element by classname, finds the next siblings, and
       * gets its pruned text context as a number or string.
       * @param {string} className
       * The class of the element to find.
       * @param {{ keepSpaces: boolean, asString: boolean }} opts
       * Configuration object to pass to {@link prune}.
       * @returns {number|string|undefined}
       */
      const getValueOfSibling = (className, opts) => {
        return prune(
          weapons[weaponIndex]
            ?.querySelector("." + className)
            ?.nextSibling
            ?.textContent,
          opts,
        );
      };

      /**
       * Gets all descendent elements with a class name.
       * @param {string} className
       * @returns {NodeList}
       */
      const getAll = (className) => {
        return weapons[weaponIndex].querySelectorAll("." + className);
      };

      /**
       * Gets the first descendent element with the given class name.
       * @param {string} className
       * @returns {Node}
       */
      const getFirst = (className) => {
        return getAll(className)[0];
      };

      // create the nested object that will represent this weapon and assign it
      // to symData
      const weaponData = {};
      const weaponName = getValue("lblWeaponNameValue", {
        keepSpaces: true,
        asNumber: false,
      });
      symData[weaponName] = weaponData;

      /**
       * Creates a function which gets a spread value from tabulated data and
       * assigns it to symData object.
       * @param {number} row
       * The row from the data to get. **Not** 0-indexed, it is 1-indexed.
       * @param {number} col
       * The column from the data to get. **Not** 0-indexed, it is 1-indexed.
       * @param {boolean} [dynamicCol]
       * One table has strange HTML structure where every 3rd row in the data,
       * starting with the first row, has one additional HTML element for some
       * reason. If this is true, this will be automatically accounted for.
       * @returns {(property: string, className: string) => void}
       */
      const getSpread = (row, col, dynamicCol = true) => {
        return (property, className) => {
          if (dynamicCol && row % 3 !== 1) col--;

          weaponData[property] = prune(
            getFirst(className)
              ?.querySelectorAll("tr")[row]
              ?.children[col]
              ?.textContent,
          );
        };
      };

      /**
       * Creates a function which finds the first shot spread multiplier based
       * on information from tabulated data.
       * @param {number} row
       * @param {number} col
       * @returns {(property: string, className: string) => void}
       */
      const getFssm = (row, col) => {
        return (property, className) => {
          getSpread(row, col)(property, className);
          const firstSips = Number(weaponData[property]);
          const sips = Number(weaponData.adsStandSpreadInc);

          weaponData[property] = Number(
            sips === 0 ? sips : (firstSips / sips).toFixed(0),
          );
        };
      };

      // iterate over all meaningful data for this weapon.
      // For each array:
      //   1) the name of the property that will be assigned on symData
      //   2) the className of the element whose textContext contains the value
      //   3) an optional customizing function that fully replaces the behavior
      //      this iterator does with each array by default.
      [
        ["ammoCapacity", "lblMag"],
        ["rateOfFire", "lblRPMValue"],
        ["pellets", "chartMinMaxLabel", (property, className) => {
          const labels = getAll(className);

          for (let labelIndex = 0; labelIndex < labels.length; labelIndex++) {
            const label = labels[labelIndex];

            if (label.textContent.includes("pellets")) {
              weaponData[property] = prune(label?.textContent);
              break;
            }
          }
        }],
        ["initialVelocity", "lblSpeedValue"],
        ["dragCoefficient", "lblDragCoe"],
        ["reloadTime", "lblReloadLeft"],
        ["reloadTimeEmpty", "lblReloadEmpty"],
        ["deployTime", "lblDeployTime"],
        ["verticalRecoil", "recoilInitUpValue"],
        ["recoilLeft", "recoilHorValue", (property, className) => {
          const number = getValue(className);
          weaponData[property] = Math.abs(number);
        }],
        ["recoilRight", "recoilHorValue", (property, className) => {
          const number = getValueOfSibling(className);
          weaponData[property] = Math.abs(number);
        }],
        [
          "recoilFirstShotMultiplier",
          "recoilFirstShot",
          (property, className) => {
            weaponData[property] = prune(
              getFirst(className)
                ?.children[1]
                ?.textContent,
            );
          },
        ],
        ["recoilDecrease", "recoilDec"],
        ["dispersion", "hipSpreadValue"],
        ["adsStandBaseMin", "spreadTable", getSpread(1, 1)],
        ["adsStandBaseMax", "spreadTable", getSpread(1, 2)],
        ["adsCrouchBaseMin", "spreadTable", getSpread(2, 1)],
        ["adsCrouchBaseMax", "spreadTable", getSpread(2, 2)],
        ["adsProneBaseMin", "spreadTable", getSpread(3, 1)],
        ["adsProneBaseMax", "spreadTable", getSpread(3, 2)],
        ["hipStandBaseMin", "spreadTable", getSpread(4, 1)],
        ["hipStandBaseMax", "spreadTable", getSpread(4, 2)],
        ["hipCrouchBaseMin", "spreadTable", getSpread(5, 1)],
        ["hipCrouchBaseMax", "spreadTable", getSpread(5, 2)],
        ["hipProneBaseMin", "spreadTable", getSpread(6, 1)],
        ["hipProneBaseMax", "spreadTable", getSpread(6, 2)],
        ["adsStandSpreadInc", "spreadIncDecTable", getSpread(2, 1, false)],
        ["hipStandSpreadInc", "spreadIncDecTable", getSpread(2, 2, false)],
        ["adsStandFirstSpreadMul", "spreadIncDecTable", getFssm(1, 1)],
        ["hipStandFirstSpreadMul", "spreadIncDecTable", getFssm(1, 2)],
        ["adsStandSpreadDec", "spreadIncDecTable", getSpread(3, 1, false)],
        ["hipStandSpreadDec", "spreadIncDecTable", getSpread(3, 2, false)],
      ].forEach(([property, className, customBehavior]) => {
        // do custom behavior if appropriate
        if (typeof customBehavior === "function") {
          customBehavior(property, className);
          return;
        }

        // if there is no value to save, don't add it to symData
        const value = getValue(className);
        if (value === undefined) return;

        // assign the value to symData
        weaponData[property] = value;
      });
    }
  }

  write("./sym-data.json", JSON.stringify(symData));
  write("./sym-data-pretty.json", prettifySymData(symData));
});

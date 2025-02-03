import fs from "node:fs";
import jsdom from "jsdom";

const { JSDOM } = jsdom;

/**
 * Removes undesirable noise surrounding a string.
 * Currently, this removes any "°" in the string and plucks the first nonempty
 * word if the string has any spaces. If the latter is undesirable, the second
 * optional configuration object can deactivate this behavior.
 * @param {string} string
 * @param {{ keepSpaces: boolean }} [opts]
 * @returns {string|undefined}
 */
const prune = (string, { keepSpaces } = {}) => {
  if (typeof string !== "string") return;

  if (!keepSpaces) {
    string = (() => {
      const strings = string.split(" ");
      for (const candidate of strings) {
        if (candidate.length !== 0) return candidate;
      }
      return string;
    })();
  }

  ["°"].forEach((badCharacter) => {
    string = string.replaceAll(badCharacter, "");
  });

  return string;
};

// read the HTML file
fs.readFile("./Sym.html", "utf8", (error, data) => {
  if (error) {
    console.log(error);
    return;
  }

  const { document } = new JSDOM(data).window;

  const symData = {};

  // iterate over all weapon classes (assault, medic, support, scout, sidearm,
  // misc)
  const weaponClasses = document.querySelectorAll(".sortableTable");
  for (let classIndex = 0; classIndex < weaponClasses.length; classIndex++) {
    // iterate over every weapon in the weapon class
    const weapons = weaponClasses[classIndex].children;
    for (let weaponIndex = 0; weaponIndex < weapons.length; weaponIndex++) {
      /**
       * Finds a descendent element by classname and gets its text context.
       * @param {string} className
       * The class of the element to find.
       * @param {{ keepSpaces: boolean }} opts
       * Configuration object to pass to {@link prune}.
       * @returns {string|undefined}
       */
      const getText = (className, opts) => {
        return prune(
          weapons[weaponIndex]
            ?.querySelector("." + className)
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
      const weapon = {};
      symData[getText("lblWeaponNameValue", { keepSpaces: true })] = weapon;

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

          weapon[property] = prune(
            getFirst(className)
              ?.querySelectorAll("tr")[row]
              ?.children[col]
              ?.textContent,
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
              weapon[property] = prune(label?.textContent);
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
        ["horizontalRecoil", "recoilHorValue", (property, className) => {
          const number = getText(className);
          weapon[property] = String(Math.abs(Number(number)));
        }],
        [
          "recoilFirstShotMultiplier",
          "recoilFirstShot",
          (property, className) => {
            weapon[property] = prune(
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
        [
          "adsStandFirstSpreadMul",
          "spreadIncDecTable",
          (property, className) => {
            getSpread(1, 1)(property, className);
            const firstSips = Number(weapon[property]);
            const sips = Number(weapon.adsStandSpreadInc);

            weapon[property] = sips === 0
              ? sips
              : (firstSips / sips).toFixed(0);
          },
        ],
        [
          "hipStandFirstSpreadMul",
          "spreadIncDecTable",
          (property, className) => {
            getSpread(1, 2)(property, className);
            const firstSips = Number(weapon[property]);
            const sips = Number(weapon.hipStandSpreadInc);

            weapon[property] = sips === 0
              ? sips
              : (firstSips / sips).toFixed(0);
          },
        ],
        ["adsStandSpreadDec", "spreadIncDecTable", getSpread(3, 1, false)],
        ["hipStandSpreadDec", "spreadIncDecTable", getSpread(3, 2, false)],
      ].forEach(([property, className, customBehavior]) => {
        // do custom behavior if appropriate
        if (typeof customBehavior === "function") {
          customBehavior(property, className);
          return;
        }

        // if there is no value to save, don't add it to symData
        const value = getText(className);
        if (value === undefined) return;

        // assign the value to symData
        weapon[property] = value;
      });
    }
  }

  fs.writeFile("./sym-data.json", JSON.stringify(symData), (error) => {
    if (error) {
      console.log(error);
      return;
    }

    console.log("sym-data.json created.");
  });
});

import fs from "node:fs";

/**
 * Removes undesirable noise surrounding a string.
 * Currently, this removes any "°" in the string and plucks the first nonempty
 * word if the string has any spaces. If the latter is undesirable, the second
 * optional configuration object can deactivate this behavior.
 * The string will be coverted into a number unless the optional configuration
 * object indicates otherwise.
 * @param {string} string
 * @param {{ keepSpaces: boolean, asNumber: boolean }} [opts]
 * @returns {string|number|undefined}
 */
export const prune = (string, { keepSpaces, asNumber } = {}) => {
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

  return asNumber === false ? string : Number(string);
};

/**
 * Creates a nicely formatted string representation of symData.
 * @param {object} symData
 * @returns {string}
 */
export const prettifySymData = (symData) => {
  const INDENT = "  ";
  const DOUBLE_INDENT = INDENT + INDENT;

  let result = "{\n";

  Object.keys(symData).forEach((weapon) => {
    const stats = symData[weapon];
    result += `${INDENT}"${weapon}": {` + "\n";

    const numStats = Object.keys(stats).length;
    let statsSeen = 0;
    Object.keys(stats).forEach((attribute) => {
      const comma = ++statsSeen < numStats ? "," : "";
      result += `${DOUBLE_INDENT}"${attribute}": ${stats[attribute]}${comma}` +
        "\n";
    });
    result += INDENT + "},\n";
  });
  return result.substring(0, result.length - 2) + "\n}";
};

/**
 * Write the content to the given file name.
 * @param {string} filename
 * @param {string} contents
 */
export const write = (filename, content) => {
  fs.writeFile(filename, content, (error) => {
    if (error) {
      console.log(error);
      return;
    }

    console.log(`${filename} created.`);
  });
};

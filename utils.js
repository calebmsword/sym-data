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
 * Wraps a node-style asychronous function in a promise.
 * 
 * @template T
 * The type of data the node-style callback retrieves if successful.
 * 
 * @param {(error: unknown, data: T) => void} nodejsAsync
 * Any async function parameterized by a node-style async callback.
 * @returns {Promise<T>}
 * A promise that resolves with the result of the node-style asynchronous
 * function.
 */
const promisify = (nodejsAsync) => {
  return new Promise((resolve, reject) => {
    nodejsAsync((error, data) => {
      error === null ? resolve(data) : reject(error);
    });
  });
}

/**
 * Asynchronously creates a string representation of the contents of a file.
 * @param {string} filename
 * The name of the file to read. Provide either an absolute path or a path
 * relative to the current working directory.
 * @returns Promise<string>
 */
export const read = (filename) => {
  return promisify((nodeCallback) => {
    fs.readFile(filename, "utf8", nodeCallback);
  });
};

/**
 * Asynchronously writes to a given file.
 * @param {string} filename
 * The name of the file that will be written to. Provide either an absolute path
 * or a path relative to the current working directory.
 * @param {string} content
 * A string representing the file to write.
 * @returns 
 */
export const write = async (filename, content) => {
  await promisify((nodeCallback) => {
    fs.writeFile(filename, content, nodeCallback);
  });
  console.log(`Created ${filename}`);
};

/**
 * A simple wrapper around Promise.all.
 * 
 * All arguments are wrapped in a `Promise.resolve` meaning Promises/A+
 * compliant implementations will work seamlessly with this function.
 * 
 * @param  {...any} args
 * Every argument is passed to `Promise.all`. 
 * @returns Promise<any[]>
 */
export const parallel = (...args) => {
  return Promise.all(args.map((x) => {
    return Promise.resolve(x);
  }));
};

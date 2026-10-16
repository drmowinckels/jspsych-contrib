/**
 * This script updates the root README.md file with the list of all packages when a new one is
 * published, or when the description/author of an existing package is updated.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesDir = path.join(__dirname, "packages");
const readmePath = path.join(__dirname, "README.md");

function getPackageInfo(packageDir) {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  return {
    name: packageJson.name,
    description: packageJson.description,
    author: packageJson.author.name,
    authorUrl: packageJson.author.url,
  };
}

const categories = [
  { key: "tasks", title: "Tasks", label: "Task", blurb: "Complete experimental paradigms." },
  {
    key: "responses",
    title: "Response and stimulus plugins",
    label: "Plugin",
    blurb: "General-purpose building blocks for presenting stimuli and collecting responses.",
  },
  { key: "surveys", title: "Surveys and scales", label: "Plugin", blurb: "Questionnaire items and rating scales." },
  {
    key: "utilities",
    title: "Utilities, data and infrastructure",
    label: "Plugin",
    blurb: "Plugins for data storage, redirects, device handling and other infrastructure.",
  },
];

function renderRow(info, prefix) {
  const packageName = info.name.replace(/^\@jspsych-contrib\//g, "");
  const link = `https://github.com/jspsych/jspsych-contrib/blob/main/packages/${packageName}/README.md`;
  const shortName = packageName.replace(prefix, "");
  const authorRender = info.authorUrl ? `[${info.author}](${info.authorUrl})` : info.author;
  return `[${shortName}](${link}) | ${authorRender} | ${
    info.description ? info.description : `_Description for ${shortName}._`
  } \n`;
}

function renderTable(heading, label, blurb, rows) {
  return `${heading}\n\n${blurb}\n\n${label} | Contributor | Description\n----------- | ----------- | -----------\n${rows}\n`;
}

async function updateRootReadme() {
  const packageCategories = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package-categories.json"), "utf-8")
  );
  const packageInfos = fs
    .readdirSync(packagesDir)
    .map((dir) => path.join(packagesDir, dir))
    .filter((dir) => fs.lstatSync(dir).isDirectory())
    .map(getPackageInfo)
    .filter((info) => info !== null);

  const grouped = Object.fromEntries(categories.map((c) => [c.key, ""]));
  let extensionList = "";

  packageInfos.forEach((info) => {
    const packageName = info.name.replace(/^\@jspsych-contrib\//g, "");
    if (packageName.startsWith("extension-")) {
      extensionList += renderRow(info, /^extension-/);
    } else {
      const key = packageCategories[packageName];
      if (!(key in grouped)) {
        throw new Error(
          `${packageName} has no valid category in package-categories.json (use one of: ${Object.keys(grouped).join(", ")})`
        );
      }
      grouped[key] += renderRow(info, /^plugin-/);
    }
  });

  const sections = [
    "### Plugins\n\nPlugins are grouped by purpose.\n\n",
    ...categories.map((c) => renderTable(`#### ${c.title}`, c.label, c.blurb, grouped[c.key])),
    renderTable("### Extensions", "Extension", "Extensions add functionality to jsPsych experiments.", extensionList),
  ];

  const readme = fs.readFileSync(readmePath, "utf-8");
  const updated = readme.replace(
    /### Plugins[\s\S]*?\n## Guidelines for contributions/,
    () => sections.join("") + "\n## Guidelines for contributions"
  );
  fs.writeFileSync(readmePath, updated);
}

export default updateRootReadme;

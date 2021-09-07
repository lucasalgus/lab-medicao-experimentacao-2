import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import csv from "convert-csv-to-json";
import { Parser } from "json2csv";

const execCommand = promisify(exec);

const runClones = async (repos) => {
  for (let i = 0; i < repos.length; i++) {
    console.log("clonando repositório " + i);
    const repo = repos[i];

    try {
      await execCommand(`rm -rf repo`);
      await execCommand(`git clone ${repo.sshUrl} repo`);

      await getCodeMetrics(repos, i);

      console.log(repos[i]);
    } catch (error) {
      console.log("erro, tentando novamente");
      console.log(error);
      await execCommand(`rm -rf repo`);
      i--;
    }
  }
};

const getCodeMetrics = async (repos, i) => {
  const result = await execCommand("sloc repo");
  const output = result.stdout.split("\n").map((l) => l.replace(/^\D+/g, ""));

  const source = +output[4];
  const comments = +output[5];

  repos[i].loc = source;
  repos[i].comments = comments;
};

const main = async () => {
  const repos = csv
    .formatValueByType()
    .fieldDelimiter(",")
    .getJsonFromCsv("./result.csv");

  await runClones(repos);

  const parser = new Parser();
  const file = parser.parse(repos);

  fs.writeFileSync("./result.csv", file);
};

main();

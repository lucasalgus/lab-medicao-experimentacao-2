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

      await getCodeMetrics(repos[i]);
      await getQualityMetrics(repos[i]);

      console.log(repos[i]);
    } catch (error) {
      console.log("erro, tentando novamente");
      console.log(error);
      await execCommand(`rm -rf repo`);
      i--;
    }
  }
};

const getCodeMetrics = async (repo) => {
  const result = await execCommand("sloc repo");
  const output = result.stdout.split("\n").map((l) => l.replace(/^\D+/g, ""));

  const source = +output[4];
  const comments = +output[5];

  repo.loc = source;
  repo.comments = comments;
};

const median = (values) => {
  if (values.length === 0) return 0;

  values.sort(function (a, b) {
    return a - b;
  });

  let half = Math.floor(values.length / 2);

  if (values.length % 2) return values[half];

  return (values[half - 1] + values[half]) / 2.0;
};

const getQualityMetrics = async (repo) => {
  await execCommand("cd ck; java -jar ck.jar ../repo; cd ..");

  const result = csv
    .formatValueByType()
    .fieldDelimiter(",")
    .getJsonFromCsv("./ck/class.csv");

  const cboValues = result.map((i) => i.cbo);
  const ditValues = result.map((i) => i.dit);
  const lcomValues = result.map((i) => i.lcom);

  const cboMedian = median(cboValues);
  const ditMedian = median(ditValues);
  const lcomMedian = median(lcomValues);

  repo.cboMedian = cboMedian;
  repo.ditMedian = ditMedian;
  repo.lcomMedian = lcomMedian;

  await execCommand("cd ck; rm *.csv; cd ..");
};

const main = async () => {
  const repos = csv
    .formatValueByType()
    .fieldDelimiter(",")
    .getJsonFromCsv("./repos.csv");

  await runClones(repos);

  const parser = new Parser({
    quote: "",
  });
  const file = parser.parse(repos);

  fs.writeFileSync("./result.csv", file);
};

main();

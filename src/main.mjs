import fs from "fs";
import gql from "graphql-tag";
import { Parser } from "json2csv";

import { client } from "./client.mjs";

let repos = [];
let lastCursor = null;

const getQuery = () => gql`
  query Repos {
    search(query: "language:Java", type: REPOSITORY, first: 100, after: ${
      lastCursor ? `"${lastCursor}"` : null
    }) {
      pageInfo {
        endCursor
      }
      nodes {
        ... on Repository {
          nameWithOwner
          sshUrl
          createdAt
          updatedAt
          stargazers {
            totalCount
          }
          releases {
            totalCount
          }
        }
      }
    }
  }
`;

const secondsToDays = (time) => {
  return parseInt(time / 86_400_000);
};

const main = async () => {
  try {
    for (let i = 0; i < 10; i++) {
      console.log("baixando página " + i);
      try {
        const res = await client.query({
          query: getQuery(),
        });

        const { endCursor } = res.data.search.pageInfo;
        lastCursor = endCursor;

        repos = [...repos, ...res.data.search.nodes];
      } catch (error) {
        console.log("erro, tentando novamente");
        i--;
      }
    }

    const filteredRepos = repos.map((repo) => ({
      nameWithOwner: repo.nameWithOwner,
      sshUrl: repo.sshUrl,
      starsCount: repo.stargazers.totalCount,
      releasesCount: repo.releases.totalCount,
      ageInYears:
        secondsToDays(
          new Date().getTime() - new Date(repo.createdAt).getTime()
        ) / 365,
    }));

    const parser = new Parser({
      quote: "",
    });
    const csv = parser.parse(filteredRepos);

    fs.writeFileSync("./result.csv", csv);
  } catch (error) {
    console.log(error);
  }
};

main();

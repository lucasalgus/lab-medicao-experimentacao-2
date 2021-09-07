import fs from "fs";
import gql from "graphql-tag";
import { Parser } from "json2csv";

import { client } from "./client.mjs";

let repos = [];
let lastCursor = null;

const getQuery = () => gql`
  query Repos {
    search(query: "stars:>10000", type: REPOSITORY, first: 100, after: ${
      lastCursor ? `"${lastCursor}"` : null
    }) {
      pageInfo {
        endCursor
      }
      nodes {
        ... on Repository {
          nameWithOwner
          url
          createdAt
          updatedAt
          stargazers {
            totalCount
          }
          releases {
            totalCount
          }
		  pullRequests(states: MERGED) {
			totalCount
		  }
          languages(orderBy: { field: SIZE, direction: DESC }, first: 1) {
            edges {
              node {
                name
              }
            }
          }
          totalIssues: issues {
            totalCount
          }
          closedIssues: issues(states: CLOSED) {
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
      const res = await client.query({
        query: getQuery(),
      });

      const { endCursor } = res.data.search.pageInfo;
      lastCursor = endCursor;

      repos = [...repos, ...res.data.search.nodes];
    }

    const filteredRepos = repos.map((repo) => ({
      nameWithOwner: repo.nameWithOwner,
      url: repo.url,
      age: secondsToDays(
        new Date().getTime() - new Date(repo.createdAt).getTime()
      ),
      mergedPRsCount: repo.pullRequests.totalCount,
      releasesCount: repo.releases.totalCount,
      lastUpdatedSince: secondsToDays(
        new Date().getTime() - new Date(repo.updatedAt).getTime()
      ),
      primaryLanguage: repo.languages.edges[0]?.node.name ?? "Empty",
      closedIssuesPercentage: repo.totalIssues.totalCount
        ? (
            (repo.closedIssues.totalCount / repo.totalIssues.totalCount) *
            100
          ).toFixed(2)
        : 0,
    }));

    const parser = new Parser();
    const csv = parser.parse(filteredRepos);

    fs.writeFileSync("./result.csv", csv);
  } catch (error) {
    console.log(error);
  }
};

main();

import { getInput, getIDToken } from '@actions/core';
import { getOctokit, context } from "@actions/github";
import { inspect } from "util";

const githubToken = getInput('token');
const artifactId = parseInt(getInput('artifact-id'));
const buildVersion = process.env.GITHUB_SHA!;
const idToken = await getIDToken();

const octokit = getOctokit(githubToken);

const response = await octokit.request('POST /repos/{owner}/{repo}/pages/deployments', {
  owner: context.repo.owner,
  repo: context.repo.repo,
  artifact_id: artifactId,
  pages_build_version: buildVersion,
  oidc_token: idToken,
});

console.log(inspect(response, { colors: true, depth: Infinity }));

/* build command: 

npx esbuild .\.github\actions\deploy\index.ts --bundle --format=esm --platform=node --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" --outfile=.\.github\actions\deploy\dist\index.js --minify --tree-shaking=true

*/
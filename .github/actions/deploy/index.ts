import { getInput, getIDToken } from '@actions/core';
import { getOctokit, context } from "@actions/github";
import { DefaultArtifactClient } from '@actions/artifact'
import { execSync } from 'node:child_process';

const githubToken = getInput('token');
const filePath = getInput('path');
let expireTime = parseFloat(getInput('expire'));
if (expireTime < 0 || isNaN(expireTime) || !isFinite(expireTime)) expireTime = 0.5;

const buildVersion = process.env.GITHUB_SHA!;
const idToken = await getIDToken();
const artifactName = Array.from({ length: 3 }, _ => Math.random().toString(36).slice(2, 10)).join("-");
const artifact = new DefaultArtifactClient();
const octokit = getOctokit(githubToken);

const runner_temp = process.env.RUNNER_TEMP ?? ".";
execSync(
  `tar \
    --dereference --hard-dereference \
    --directory "${filePath}" \
    -cvf "$RUNNER_TEMP/artifact.tar" \
    --exclude=.git \
    --exclude=.github \
    --exclude=".[^/]*" \
    .`
);

const { id: artifactId } = await artifact.uploadArtifact(
  artifactName,
  [`${runner_temp}/artifact.tar`],
  runner_temp,
  { retentionDays: 1 }
);
// console.log(`Created artifact with id: ${artifactId} (bytes: ${size})`);
const startTime = performance.now();

const deployPage = async () => {
  const response = await octokit.request('POST /repos/{owner}/{repo}/pages/deployments', {
    owner: context.repo.owner,
    repo: context.repo.repo,
    artifact_id: artifactId,
    pages_build_version: buildVersion,
    oidc_token: idToken,
  });
  console.log("Page deployed to:", response.data?.page_url ?? response);
};

const deleteArtifact = async () => {
  // sleep 100 ms
  await new Promise((resolve) => setTimeout(() => resolve(0), 500));
  const { id } = await artifact.deleteArtifact(artifactName);
  const finishTime = performance.now();
  console.log("Deleted Artifact ID:", id);
  console.log("Artifact Existing Time:", finishTime - startTime, "ms");
};

await Promise.all([deployPage(), deleteArtifact()]);

/* build command: 

npx esbuild .\.github\actions\deploy\index.ts --bundle --format=esm --platform=node --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" --outfile=.\.github\actions\deploy\dist\index.js --minify --tree-shaking=true

*/
import { getInput, getIDToken } from '@actions/core';
import { getOctokit, context } from "@actions/github";
import { DefaultArtifactClient } from '@actions/artifact'

const githubToken = getInput('token');
// const artifactId = parseInt(getInput('artifact-id'));
const buildVersion = process.env.GITHUB_SHA!;
const idToken = await getIDToken();

const artifactName = Array.from({ length: 3 }, _ => Math.random().toString(36).slice(2, 10)).join("-");

const artifact = new DefaultArtifactClient();

const octokit = getOctokit(githubToken);

const { id: artifactId } = await artifact.uploadArtifact(
  artifactName,
  ['_site/artifact.tar'],
  "./_site",
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
  await new Promise((resolve) => setTimeout(() => resolve(0), 100));
  const { id } = await artifact.deleteArtifact(artifactName);
  const finishTime = performance.now();
  console.log("Deleted Artifact ID:", id);
  console.log("Artifact Existing Time:", finishTime - startTime, "ms");
};

await Promise.all([deployPage(), deleteArtifact()]);

/* build command: 

npx esbuild .\.github\actions\deploy\index.ts --bundle --format=esm --platform=node --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" --outfile=.\.github\actions\deploy\dist\index.js --minify --tree-shaking=true

*/
const { Toolkit } = require("actions-toolkit");
const core = require("@actions/core");
const { execSync } = require("child_process");

// Change working directory if user defined PACKAGEJSON_DIR
if (process.env.PACKAGEJSON_DIR) {
    process.chdir(`${process.env.GITHUB_WORKSPACE}/${process.env.PACKAGEJSON_DIR}`);
}

// Run GitHub Action!
Toolkit.run(async (tools) => {
    const pkg = tools.getPackageJSON();
    const event = tools.context.payload;
    const commitMessage = "version bump to";
    const commitPrereleaseMessage = "prerelease version bump to";
    const labels = event.pull_request.labels.map(label => label.name);

    core.setOutput('update', 'true');
    let version;
    if (labels.includes('patch')) {
      version = 'patch';
    } else if (labels.includes('minor')) {
      version = 'minor';
    } else if (labels.includes('major')) {
      version = 'major';
    } else if (labels.includes('prerelease')) {
      version = 'prerelease';
    } else {
      core.setOutput('update', 'false');
      tools.exit.success('Labels with keywords not found');
      return;
    }

    switch (version) {
      case 'patch':
      case 'minor':
      case 'major':
        try {
          const current = pkg.version.toString();

          await tools.runInWorkspace("git", [
              "config",
              "user.name",
              `"${process.env.GITHUB_USER || "Automated Version Bump"}"`,
          ]);
          await tools.runInWorkspace("git", [
              "config",
              "user.email",
              `"${
                  process.env.GITHUB_EMAIL ||
                  "gh-action-bump-version@users.noreply.github.com"
              }"`,
          ]);

          await tools.runInWorkspace("git", [
            "flow",
            "init",
            "-d",
          ]);

          await tools.runInWorkspace("npm", [
              "version",
              "--allow-same-version=true",
              "--git-tag-version=false",
              current,
          ]);

          console.log("current:", current, "/", "version:", version);

          let newVersion = execSync(
              `npm version --git-tag-version=false ${version}`
          )
              .toString()
              .trim();
          newVersion = `${process.env["INPUT_TAG-PREFIX"]}${newVersion}`;

          process.chdir(process.env.GITHUB_WORKSPACE);

          await tools.runInWorkspace("git", [
            "checkout",
            "--",
            "projects/cui-design-ng/package.json"
          ]);

          await tools.runInWorkspace("git", [
            "flow",
            "release",
            "start",
            `${newVersion}`
          ]);

          process.chdir(`${process.env.GITHUB_WORKSPACE}/${process.env.PACKAGEJSON_DIR}`);

          execSync(
            `npm version --git-tag-version=false ${version}`
          );

          process.chdir(process.env.GITHUB_WORKSPACE);

          await tools.runInWorkspace("git", [
            "commit",
            "-a",
            "-m",
            `ci: ${commitMessage} ${newVersion}`,
          ]);


          await tools.runInWorkspace("git", [
            "flow",
            "release",
            "finish",
            `${newVersion}`,
            "-m",
            "chore: version bumped",
            `${newVersion}`,
          ]);

          console.log("new version:", newVersion);

          await tools.runInWorkspace("git", [
              "push",
              "--all",
              "--follow-tags",
              "--no-verify"
          ]);
        } catch (e) {
            tools.log.fatal(e);
            tools.exit.failure("Failed to bump version");
        }
        break;
      case 'prerelease':
      default:
        try {
          await tools.runInWorkspace("git", [
              "config",
              "user.name",
              `"${process.env.GITHUB_USER || "Automated Version Bump"}"`,
          ]);
          await tools.runInWorkspace("git", [
              "config",
              "user.email",
              `"${
                  process.env.GITHUB_EMAIL ||
                  "gh-action-bump-version@users.noreply.github.com"
              }"`,
          ]);

          let newVersion = execSync(
            `npm version --git-tag-version=false ${version}`
          )
            .toString()
            .trim();

          process.chdir(process.env.GITHUB_WORKSPACE);

          await tools.runInWorkspace("git", [
            "commit",
            "-a",
            "-m",
            `ci: ${commitPrereleaseMessage} ${newVersion}`,
          ]);

          console.log("new prerelease version:", newVersion);

          const remoteRepo = `https://cytiva:${process.env["INPUT_TOKEN"]}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
          await tools.runInWorkspace("git", [
              "push",
              remoteRepo,
              "--all",
              "--follow-tags",
              "--no-verify"
          ]);
        } catch (e) {
            tools.log.fatal(e);
            tools.exit.failure("Failed to bump prerelease version");
        }
        break;
    }

    tools.exit.success("Version bumped!");
});

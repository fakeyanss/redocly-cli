const fs = require('fs');
const slackifyMarkdown = require('slackify-markdown');

const generatedLogsCli = fs.readFileSync('./packages/cli/CHANGELOG.md').toString();
const [, logCli] = generatedLogsCli.split('\n## ', 2);
const generatedLogsCore = fs.readFileSync('./packages/core/CHANGELOG.md').toString();
const [, logCore] = generatedLogsCore.split('\n## ', 2);

fs.mkdirSync('./output', { recursive: true });
fs.writeFileSync(
  './output/release-message.json',
  JSON.stringify({
    text: slackifyMarkdown(
      `:bookmark: New @redocly/cli release ${logCli}\n\n:bookmark: New @fakeyanss/redocly-openapi-core release ${logCore}\n\n`
    ),
  })
);

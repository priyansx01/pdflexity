const fs = require('fs');
const { spawnSync } = require('child_process');

const pdfBuffer = Buffer.from('%PDF-1.4\n%EOF\n');
fs.writeFileSync('/tmp/test1.pdf', pdfBuffer);
fs.writeFileSync('/tmp/test2.pdf', pdfBuffer);

const input = JSON.stringify({
  op: 'merge',
  inputPaths: ['/tmp/test1.pdf', '/tmp/test2.pdf'],
  outputPath: '/tmp/merged.pdf'
});

const res = spawnSync('./apps/electron/bin/pdflexity-engine.exe', {
  input: input + '\n',
  encoding: 'utf-8'
});

console.log("STDOUT:", res.stdout);
console.log("STDERR:", res.stderr);
if (fs.existsSync('/tmp/merged.pdf')) {
  console.log("FILE SIZE:", fs.statSync('/tmp/merged.pdf').size);
}

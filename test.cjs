const fs = require('fs');
const content = fs.readFileSync('src/app/lib/contexts/AppDataContext.tsx', 'utf8');
let depth = 0;
let lines = content.split('\n');
for (let i = 60; i < 220; i++) {
  let line = lines[i];
  let openCount = (line.match(/\{/g) || []).length;
  let closeCount = (line.match(/\}/g) || []).length;
  depth += openCount - closeCount;
  console.log(`${i+1}: ${depth} | ${line}`);
}

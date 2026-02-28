const fs = require('fs');

function replaceAny(file) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/: any/g, ': unknown');
    content = content.replace(/as any/g, 'as unknown');
    fs.writeFileSync(file, content);
  }
}

replaceAny('src/__tests__/chat-flow.test.tsx');
replaceAny('src/__tests__/calendar-conflict.test.tsx');

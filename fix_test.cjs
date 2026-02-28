const fs = require('fs');
const file = 'src/components/__tests__/AIConciergeChat.test.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/describe\('Header Simplification', \(\) => {[\s\S]*?it\('always renders the dictation microphone button in the input area'/m, "describe('Header Simplification', () => {\n    it('always renders the dictation microphone button in the input area'");
  fs.writeFileSync(file, content);
}

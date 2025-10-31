/**
 * Utility script to replace all Unsplash avatar URLs with getMockAvatar() calls
 * This updates all mock data files across consumer trips, pro trips, and events
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const updateAvatarsInFile = (filePath: string): boolean => {
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Check if file needs getMockAvatar import
    const needsImport = content.includes('avatar:') && !content.includes('getMockAvatar');
    
    if (needsImport) {
      // Add import at the top after other imports
      const importStatement = "import { getMockAvatar } from '../utils/mockAvatars';\n";
      const importStatement2 = "import { getMockAvatar } from '../../utils/mockAvatars';\n";
      
      if (content.includes("from '../types/pro'")) {
        // Pro trip file
        content = content.replace(
          "import { ProTripData } from '../../types/pro';\n",
          `import { ProTripData } from '../../types/pro';\n${importStatement2}`
        );
      } else if (content.includes("from '../types/events'")) {
        // Events file
        content = content.replace(
          "import { EventData } from '../types/events';\n",
          `import { EventData } from '../types/events';\n${importStatement}`
        );
      } else {
        // Consumer trips file
        const firstImportMatch = content.match(/^import .+;\n/m);
        if (firstImportMatch) {
          const insertIndex = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
          content = content.slice(0, insertIndex) + importStatement + content.slice(insertIndex);
        }
      }
    }
    
    // Replace all Unsplash URLs with getMockAvatar() calls
    // Pattern: avatar: 'https://images.unsplash.com/photo-...?w=40&h=40&fit=crop&crop=face'
    content = content.replace(
      /avatar:\s*'https:\/\/images\.unsplash\.com\/[^']+'/g,
      (match) => {
        // Extract the name from context (look backward for name: 'XXX')
        return match; // Will be replaced in second pass
      }
    );
    
    // More targeted replacement with name extraction
    content = content.replace(
      /{\s*id:\s*\d+,\s*name:\s*['"]([^'"]+)['"],\s*avatar:\s*'https:\/\/images\.unsplash\.com\/[^']+'/g,
      (match, name) => {
        return match.replace(
          /avatar:\s*'https:\/\/images\.unsplash\.com\/[^']+'/,
          `avatar: getMockAvatar('${name}')`
        );
      }
    );
    
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
    return false;
  }
};

// Update consumer trips
console.log('📝 Updating consumer trips...');
updateAvatarsInFile('src/data/tripsData.ts');

// Update events
console.log('\n📝 Updating events...');
updateAvatarsInFile('src/data/eventsMockData.ts');

// Update pro trips
console.log('\n📝 Updating pro trips...');
const proTripsDir = 'src/data/pro-trips';
const proTripFiles = readdirSync(proTripsDir).filter(f => f.endsWith('.ts'));
proTripFiles.forEach(file => {
  updateAvatarsInFile(join(proTripsDir, file));
});

console.log('\n✅ All avatar updates complete!');

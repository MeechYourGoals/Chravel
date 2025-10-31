// AI-generated universal avatars for consistent mock user display
const maleAvatarPath = '/avatars/avatar-male-ai.png';
const femaleAvatarPath = '/avatars/avatar-female-ai.png';

// Gender classification by first name
const maleNames = [
  'Marcus', 'Jamal', 'Darius', 'Terrell', 'Jerome', 'Alex', 'David', 'Jack', 
  'Steve', 'Chris', 'Jordan', 'Mike', 'LeBron', 'Anthony', 'Austin', 'D\'Angelo',
  'Rui', 'Christian', 'Jarred', 'Taurean', 'Gabe', 'Cam', 'Max', 'Dalton', 
  'Jalen', 'Maxwell', 'Chen', 'James', 'Coach', 'Tyler', 'Mason', 'Tommy',
  'Commissioner', 'Rob', 'Tony', 'Dave', 'Jason', 'River', 'Tom', 'Luis',
  'Michael', 'Kevin', 'Liam', 'Noah', 'Grandpa', 'Brent', 'Cameron', 'Ryan',
  'Kevin', 'Tyler', 'Joel', 'Devin', 'John', 'Paul', 'Travis', 'Manager',
  'Technician', 'Engineer', 'Specialist', 'Coordinator', 'Director', 'Producer',
  'Designer', 'Ambassador', 'Dr.', 'Head Coach', 'Assistant Coach', 'Team Doctor',
  'Head Trainer', 'Team Manager', 'Logistics'
];

const femaleNames = [
  'Kristen', 'Ashley', 'Megan', 'Taylor', 'Sam', 'Jenna', 'Maria', 'Jill', 
  'Emma', 'Sarah', 'Jessica', 'Maya', 'Jamie', 'Lisa', 'Anna', 'Sophie', 
  'Casey', 'Elena', 'Linda', 'Katie', 'Pat', 'Zoe', 'Chloe', 'Amara', 'Sophia',
  'Isla', 'Olivia', 'Mia', 'Sara', 'Rachel', 'Amanda', 'Heather', 'Jennifer',
  'Emily', 'Grace', 'Grandma', 'Rose', 'Nia', 'Isabella', 'Amanda', 'Keisha',
  'Dr. Elena', 'Maria Santos', 'Coach', 'Coordinator', 'Manager'
];

// Get avatar for a specific name, with fallback
export const getMockAvatar = (name: string): string => {
  if (!name || typeof name !== 'string') return femaleAvatarPath; // default
  
  const normalizedName = name.trim();
  const firstName = normalizedName.split(' ')[0];
  
  // Check if name starts with female indicator
  if (femaleNames.some(n => normalizedName.toLowerCase().includes(n.toLowerCase()))) {
    return femaleAvatarPath;
  }
  
  // Check if name starts with male indicator
  if (maleNames.some(n => normalizedName.toLowerCase().includes(n.toLowerCase()))) {
    return maleAvatarPath;
  }
  
  // Fallback: deterministic hash-based assignment
  const hash = normalizedName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return Math.abs(hash) % 2 === 0 ? maleAvatarPath : femaleAvatarPath;
};

// Current user avatar (for "You" messages)
export const currentUserAvatar = '/avatars/avatar-male-ai.png';
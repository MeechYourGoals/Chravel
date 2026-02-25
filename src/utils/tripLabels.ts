export const getTripLabels = (category: string) => {
  switch (category) {
    case 'Sports – Team Trip':
      return { schedule: 'Game Schedule', team: 'Team Roster' };
    case 'Conference':
      return { schedule: 'Conference Schedule', team: 'Conference Members' };
    case 'Tournament':
      return { schedule: 'Tournament Schedule', team: 'Tournament Roster' };
    case 'Residency':
      return { schedule: 'Residency Schedule', team: 'Show Crew' };
    default:
      return { schedule: 'Tour Schedule', team: 'Tour Team' };
  }
};

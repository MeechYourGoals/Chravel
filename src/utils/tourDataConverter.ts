import { Tour, ProTripData } from '../types/pro';

export const convertProTripToTour = (proTripData: ProTripData): Tour => {
  return {
    id: proTripData.id,
    name: proTripData.title,
    description: proTripData.description,
    artistName: proTripData.participants[0]?.name || 'Team Lead',
    startDate: proTripData.dateRange.split(' - ')[0] || '2025-01-01',
    endDate: proTripData.dateRange.split(' - ')[1] || '2025-12-31',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-15',
    teamMembers: proTripData.participants.map((p, index) => ({
      id: p.id.toString(),
      name: p.name,
      email:
        p.email ||
        `${p.name.toLowerCase().replace(' ', '.')}@${proTripData.category.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      role: p.role.toLowerCase().replace(/[^a-z]/g, '-') as any,
      permissions: index === 0 ? 'admin' : index === 1 ? 'admin' : 'editor',
      isActive: true,
    })),
    trips: proTripData.itinerary.map((day, dayIndex) => ({
      id: `${proTripData.id}-${dayIndex}`,
      tourId: proTripData.id,
      city: proTripData.location.split(',')[0] || proTripData.location,
      venue: day.events[0]?.location || 'Main Venue',
      venueAddress: `${day.events[0]?.location}, ${proTripData.location}`,
      date: day.date,
      category: proTripData.category.includes('Sports')
        ? 'private'
        : proTripData.category.includes('Business')
          ? 'corporate'
          : proTripData.category.includes('Tour')
            ? 'headline'
            : proTripData.category.includes('Conference')
              ? 'college'
              : 'private',
      status: dayIndex === 0 ? 'confirmed' : dayIndex === 1 ? 'planned' : 'confirmed',
      participants: proTripData.participants.map(p => ({
        id: p.id.toString(),
        name: p.name,
        email: p.email || '',
        avatar: p.avatar,
        role: p.role.toLowerCase().replace(/[^a-z]/g, '-') as any,
        permissions: 'viewer' as any,
        isActive: true,
      })),
      accommodation: {
        type: 'hotel',
        name: `${proTripData.location} Premium Hotel`,
        address: `Premium Location, ${proTripData.location}`,
        confirmationNumber: `${proTripData.id.toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        checkIn: day.date,
        checkOut: day.date,
      },
      transportation: {
        type: 'flight',
        details: `Premium Transport - ${proTripData.location}`,
        confirmationNumber: `TR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        dateTime: `${day.date} 14:30`,
      },
    })),
  };
};

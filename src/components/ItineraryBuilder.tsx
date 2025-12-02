import React, { useState } from 'react';
import { Calendar, Clock, Plus, GripVertical, Star, DollarSign } from 'lucide-react';
import { MapView } from './MapView';

interface ItineraryItem {
  id: string;
  name: string;
  type: 'restaurant' | 'hotel' | 'attraction' | 'activity';
  startTime?: string;
  endTime?: string;
  duration?: number;
  cost?: number;
  rating?: number;
  notes?: string;
  lat: number;
  lng: number;
  photos?: string[];
}

interface DayItinerary {
  date: string;
  items: ItineraryItem[];
}

interface ItineraryBuilderProps {
  tripId: string;
  days: DayItinerary[];
  onUpdateItinerary?: (days: DayItinerary[]) => void;
}

export const ItineraryBuilder = ({ tripId: _tripId, days, onUpdateItinerary }: ItineraryBuilderProps) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [showMap, setShowMap] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const currentDay = days[selectedDay];
  
  // Convert ItineraryItem[] to Place[] format for MapView
  const convertToMapPlaces = (items: ItineraryItem[]) => {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      position: [item.lat, item.lng] as [number, number],
      rating: item.rating,
      visitTime: item.startTime
    }));
  };

  // allPlaces reserved for multi-day map view
  const _allPlaces = convertToMapPlaces(days.flatMap(day => day.items));
  const currentDayPlaces = convertToMapPlaces(currentDay?.items || []);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newDays = [...days];
    const dayIndex = selectedDay;
    const items = [...newDays[dayIndex].items];
    const draggedIndex = items.findIndex(item => item.id === draggedItem);
    
    if (draggedIndex === -1) return;

    const draggedItemData = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItemData);
    
    newDays[dayIndex].items = items;
    onUpdateItinerary?.(newDays);
    setDraggedItem(null);
  };

  const getTotalCost = (items: ItineraryItem[]) => {
    return items.reduce((total, item) => total + (item.cost || 0), 0);
  };

  const getTotalDuration = (items: ItineraryItem[]) => {
    return items.reduce((total, item) => total + (item.duration || 0), 0);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'hotel': return '🏨';
      case 'attraction': return '🎯';
      case 'activity': return '🎪';
      default: return '📍';
    }
  };

  return (
    <div className="space-y-6">
      {/* Day Selector */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => setSelectedDay(index)}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl font-medium transition-all ${
              selectedDay === index
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            <div className="text-sm">Day {index + 1}</div>
            <div className="text-xs opacity-80">{day.date}</div>
          </button>
        ))}
      </div>

      {/* Layout Toggle */}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-white">
          Day {selectedDay + 1} Itinerary
        </h3>
        <button
          onClick={() => setShowMap(!showMap)}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition-colors"
        >
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      <div className={`grid ${showMap ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
        {/* Itinerary Timeline */}
        <div className="space-y-4">
          {/* Day Summary */}
          <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-white">Day Summary</h4>
              <button className="text-yellow-500 hover:text-yellow-400">
                <Plus size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-400">Activities</div>
                <div className="text-white font-semibold">{currentDay?.items.length || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Duration</div>
                <div className="text-white font-semibold">{getTotalDuration(currentDay?.items || [])}h</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Est. Cost</div>
                <div className="text-white font-semibold">${getTotalCost(currentDay?.items || [])}</div>
              </div>
            </div>
          </div>

          {/* Timeline Items */}
          <div className="space-y-3">
            {currentDay?.items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-4 hover:border-yellow-500/50 transition-all cursor-move group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <GripVertical size={16} className="text-gray-500 group-hover:text-yellow-500" />
                  </div>
                  
                  <div className="flex-shrink-0 text-2xl">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-white truncate">{item.name}</h5>
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500 fill-current" />
                          <span className="text-sm text-gray-300">{item.rating}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                      {item.startTime && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{item.startTime}</span>
                        </div>
                      )}
                      {item.duration && (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{item.duration}h</span>
                        </div>
                      )}
                      {item.cost && (
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} />
                          <span>${item.cost}</span>
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-sm text-gray-300">{item.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Item */}
            <button className="w-full bg-gray-800/50 border-2 border-dashed border-gray-600 hover:border-yellow-500/50 rounded-2xl p-6 text-gray-400 hover:text-yellow-500 transition-all">
              <Plus size={24} className="mx-auto mb-2" />
              <div>Add Activity</div>
            </button>
          </div>
        </div>

        {/* Map View */}
        {showMap && (
          <div className="lg:sticky lg:top-6">
            <MapView
              places={currentDayPlaces}
              showRoute={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

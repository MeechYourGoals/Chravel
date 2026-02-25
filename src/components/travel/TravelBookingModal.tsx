import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plane, Hotel, UtensilsCrossed, Car, ExternalLink, Star } from 'lucide-react';
import {
  travelBookingService,
  FlightResult,
  HotelResult,
  RestaurantResult,
  TransportationResult,
} from '../../services/travelBooking';
import { useToast } from '../../hooks/use-toast';

interface TravelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  defaultLocation?: string;
}

export const TravelBookingModal: React.FC<TravelBookingModalProps> = ({
  isOpen,
  onClose,
  tripId,
  defaultLocation = '',
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('flights');
  const [loading, setLoading] = useState(false);

  // Flight search state
  const [flightParams, setFlightParams] = useState({
    origin: '',
    destination: defaultLocation,
    departDate: '',
    returnDate: '',
    passengers: 1,
    class: 'economy' as const,
  });
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);

  // Hotel search state
  const [hotelParams, setHotelParams] = useState({
    location: defaultLocation,
    checkIn: '',
    checkOut: '',
    guests: 1,
    rooms: 1,
  });
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);

  // Restaurant search state
  const [restaurantParams, setRestaurantParams] = useState({
    location: defaultLocation,
    date: '',
    time: '19:00',
    partySize: 2,
  });
  const [restaurantResults, setRestaurantResults] = useState<RestaurantResult[]>([]);

  // Transportation search state
  const [transportParams, setTransportParams] = useState({
    pickup: '',
    destination: defaultLocation,
    date: '',
    time: '12:00',
    passengers: 1,
    type: 'uber' as const,
  });
  const [transportResults, setTransportResults] = useState<TransportationResult[]>([]);

  const searchFlights = async () => {
    if (!flightParams.origin || !flightParams.destination || !flightParams.departDate) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required flight search fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const results = await travelBookingService.searchFlights(flightParams);
      setFlightResults(results);

      if (results.length === 0) {
        toast({
          title: 'API Integration Required',
          description: 'Flight search requires Amadeus, Skyscanner, or Expedia API integration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Unable to search flights. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchHotels = async () => {
    if (!hotelParams.location || !hotelParams.checkIn || !hotelParams.checkOut) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required hotel search fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const results = await travelBookingService.searchHotels(hotelParams);
      setHotelResults(results);

      if (results.length === 0) {
        toast({
          title: 'API Integration Required',
          description: 'Hotel search requires Booking.com, Expedia, or Hotels.com API integration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Unable to search hotels. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchRestaurants = async () => {
    if (!restaurantParams.location || !restaurantParams.date) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required restaurant search fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const results = await travelBookingService.searchRestaurants(restaurantParams);
      setRestaurantResults(results);

      if (results.length === 0) {
        toast({
          title: 'API Integration Required',
          description: 'Restaurant search requires OpenTable, Resy, or Yelp API integration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Unable to search restaurants. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchTransportation = async () => {
    if (!transportParams.pickup || !transportParams.destination || !transportParams.date) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required transportation search fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const results = await travelBookingService.searchTransportation(transportParams);
      setTransportResults(results);

      if (results.length === 0) {
        toast({
          title: 'API Integration Required',
          description: 'Transportation search requires Uber, Lyft, or similar API integration.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Unable to search transportation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (type: string, item: any) => {
    const result = await travelBookingService.saveBooking(type as any, item, tripId);

    if (result.success) {
      toast({
        title: 'Booking Saved',
        description: `Your ${type} booking has been saved to your trip.`,
      });

      // Open external booking URL
      window.open(item.bookingUrl, '_blank');
    } else {
      toast({
        title: 'Save Failed',
        description: 'Unable to save booking. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Travel Booking Assistant</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="flights" className="flex items-center gap-2">
              <Plane className="w-4 h-4" />
              Flights
            </TabsTrigger>
            <TabsTrigger value="hotels" className="flex items-center gap-2">
              <Hotel className="w-4 h-4" />
              Hotels
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Restaurants
            </TabsTrigger>
            <TabsTrigger value="transportation" className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              Transport
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Flight Search</CardTitle>
                <CardDescription>Find flights for your trip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="origin">Origin</Label>
                    <Input
                      id="origin"
                      value={flightParams.origin}
                      onChange={e => setFlightParams(prev => ({ ...prev, origin: e.target.value }))}
                      placeholder="JFK, New York"
                    />
                  </div>
                  <div>
                    <Label htmlFor="destination">Destination</Label>
                    <Input
                      id="destination"
                      value={flightParams.destination}
                      onChange={e =>
                        setFlightParams(prev => ({ ...prev, destination: e.target.value }))
                      }
                      placeholder="LAX, Los Angeles"
                    />
                  </div>
                  <div>
                    <Label htmlFor="departDate">Departure Date</Label>
                    <Input
                      id="departDate"
                      type="date"
                      value={flightParams.departDate}
                      onChange={e =>
                        setFlightParams(prev => ({ ...prev, departDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="returnDate">Return Date (Optional)</Label>
                    <Input
                      id="returnDate"
                      type="date"
                      value={flightParams.returnDate}
                      onChange={e =>
                        setFlightParams(prev => ({ ...prev, returnDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button onClick={searchFlights} disabled={loading}>
                  {loading ? 'Searching...' : 'Search Flights'}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {flightResults.map(flight => (
                <Card key={flight.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {flight.airline} {flight.flightNumber}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {flight.departure.airport} → {flight.arrival.airport}
                        </p>
                        <p className="text-sm">
                          {flight.departure.time} - {flight.arrival.time}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {flight.duration} •{' '}
                          {flight.stops === 0 ? 'Direct' : `${flight.stops} stops`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${flight.price}</p>
                        <p className="text-sm text-muted-foreground">{flight.currency}</p>
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => handleBooking('flight', flight)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hotels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hotel Search</CardTitle>
                <CardDescription>Find accommodations for your trip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hotelLocation">Location</Label>
                    <Input
                      id="hotelLocation"
                      value={hotelParams.location}
                      onChange={e =>
                        setHotelParams(prev => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guests">Guests</Label>
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      value={hotelParams.guests}
                      onChange={e =>
                        setHotelParams(prev => ({ ...prev, guests: parseInt(e.target.value) }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkIn">Check-in Date</Label>
                    <Input
                      id="checkIn"
                      type="date"
                      value={hotelParams.checkIn}
                      onChange={e => setHotelParams(prev => ({ ...prev, checkIn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOut">Check-out Date</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={hotelParams.checkOut}
                      onChange={e =>
                        setHotelParams(prev => ({ ...prev, checkOut: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button onClick={searchHotels} disabled={loading}>
                  {loading ? 'Searching...' : 'Search Hotels'}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {hotelResults.map(hotel => (
                <Card key={hotel.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{hotel.name}</h3>
                        <p className="text-sm text-muted-foreground">{hotel.address}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm ml-1">{hotel.rating}</span>
                          </div>
                          <div className="flex gap-1">
                            {hotel.amenities.slice(0, 3).map(amenity => (
                              <Badge key={amenity} variant="outline" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${hotel.pricePerNight}</p>
                        <p className="text-sm text-muted-foreground">per night</p>
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => handleBooking('hotel', hotel)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="restaurants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Search</CardTitle>
                <CardDescription>Find dining options for your trip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="restaurantLocation">Location</Label>
                    <Input
                      id="restaurantLocation"
                      value={restaurantParams.location}
                      onChange={e =>
                        setRestaurantParams(prev => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="New York, NY"
                    />
                  </div>
                  <div>
                    <Label htmlFor="partySize">Party Size</Label>
                    <Input
                      id="partySize"
                      type="number"
                      min="1"
                      value={restaurantParams.partySize}
                      onChange={e =>
                        setRestaurantParams(prev => ({
                          ...prev,
                          partySize: parseInt(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="restaurantDate">Date</Label>
                    <Input
                      id="restaurantDate"
                      type="date"
                      value={restaurantParams.date}
                      onChange={e =>
                        setRestaurantParams(prev => ({ ...prev, date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="restaurantTime">Time</Label>
                    <Input
                      id="restaurantTime"
                      type="time"
                      value={restaurantParams.time}
                      onChange={e =>
                        setRestaurantParams(prev => ({ ...prev, time: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button onClick={searchRestaurants} disabled={loading}>
                  {loading ? 'Searching...' : 'Search Restaurants'}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {restaurantResults.map(restaurant => (
                <Card key={restaurant.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{restaurant.name}</h3>
                        <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm ml-1">{restaurant.rating}</span>
                          </div>
                          <Badge variant="outline">{restaurant.cuisine}</Badge>
                          <Badge variant="outline">{'$'.repeat(restaurant.priceLevel)}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={restaurant.availability ? 'default' : 'secondary'}>
                          {restaurant.availability ? 'Available' : 'Full'}
                        </Badge>
                        <Button
                          size="sm"
                          className="mt-2 block"
                          onClick={() => handleBooking('restaurant', restaurant)}
                          disabled={!restaurant.availability}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Reserve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transportation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transportation Search</CardTitle>
                <CardDescription>Find transportation for your trip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pickup">Pickup Location</Label>
                    <Input
                      id="pickup"
                      value={transportParams.pickup}
                      onChange={e =>
                        setTransportParams(prev => ({ ...prev, pickup: e.target.value }))
                      }
                      placeholder="Hotel Name or Address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="transportDestination">Destination</Label>
                    <Input
                      id="transportDestination"
                      value={transportParams.destination}
                      onChange={e =>
                        setTransportParams(prev => ({ ...prev, destination: e.target.value }))
                      }
                      placeholder="Airport, Restaurant, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="transportDate">Date</Label>
                    <Input
                      id="transportDate"
                      type="date"
                      value={transportParams.date}
                      onChange={e =>
                        setTransportParams(prev => ({ ...prev, date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="transportTime">Time</Label>
                    <Input
                      id="transportTime"
                      type="time"
                      value={transportParams.time}
                      onChange={e =>
                        setTransportParams(prev => ({ ...prev, time: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button onClick={searchTransportation} disabled={loading}>
                  {loading ? 'Searching...' : 'Search Transportation'}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {transportResults.map(transport => (
                <Card key={transport.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{transport.provider}</h3>
                        <p className="text-sm text-muted-foreground">{transport.type}</p>
                        <p className="text-sm">Vehicle: {transport.vehicleType}</p>
                        <p className="text-sm text-muted-foreground">
                          ETA: {transport.estimatedTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${transport.estimatedPrice}</p>
                        <p className="text-sm text-muted-foreground">estimated</p>
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => handleBooking('transportation', transport)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Book Ride
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

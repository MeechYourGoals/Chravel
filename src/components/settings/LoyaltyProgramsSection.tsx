/**
 * Loyalty Programs Section
 * Manage airline, hotel, and rental car loyalty programs
 */
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTravelWallet } from '@/hooks/useTravelWallet';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Plane, Building, Car } from 'lucide-react';

export const LoyaltyProgramsSection: React.FC = () => {
  const { user } = useAuth();
  const {
    airlines,
    addAirline,
    deleteAirline,
    hotels,
    addHotel,
    deleteHotel,
    rentals,
    addRental,
    deleteRental,
  } = useTravelWallet(user?.id || '');
  const { toast } = useToast();

  const [isAddingAirline, setIsAddingAirline] = useState(false);
  const [isAddingHotel, setIsAddingHotel] = useState(false);
  const [isAddingRental, setIsAddingRental] = useState(false);

  const [airlineData, setAirlineData] = useState({ airline: '', program: '', number: '' });
  const [hotelData, setHotelData] = useState({ chain: '', program: '', number: '' });
  const [rentalData, setRentalData] = useState({ company: '', program: '', number: '' });

  const handleAddAirline = async () => {
    if (!airlineData.airline || !airlineData.program || !airlineData.number) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    await addAirline.mutateAsync({
      airline: airlineData.airline,
      program_name: airlineData.program,
      membership_number: airlineData.number,
      is_preferred: false,
    });
    setAirlineData({ airline: '', program: '', number: '' });
    setIsAddingAirline(false);
  };

  const handleAddHotel = async () => {
    if (!hotelData.chain || !hotelData.program || !hotelData.number) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    await addHotel.mutateAsync({
      hotel_chain: hotelData.chain,
      program_name: hotelData.program,
      membership_number: hotelData.number,
      is_preferred: false,
    });
    setHotelData({ chain: '', program: '', number: '' });
    setIsAddingHotel(false);
  };

  const handleAddRental = async () => {
    if (!rentalData.company || !rentalData.program || !rentalData.number) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    await addRental.mutateAsync({
      company: rentalData.company,
      program_name: rentalData.program,
      membership_number: rentalData.number,
      is_preferred: false,
    });
    setRentalData({ company: '', program: '', number: '' });
    setIsAddingRental(false);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Loyalty Programs</h3>
          <p className="text-sm text-muted-foreground">
            Store your frequent traveler program details
          </p>
        </div>

        <Tabs defaultValue="airlines" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="airlines">
              <Plane className="w-4 h-4 mr-2" />
              Airlines
            </TabsTrigger>
            <TabsTrigger value="hotels">
              <Building className="w-4 h-4 mr-2" />
              Hotels
            </TabsTrigger>
            <TabsTrigger value="rentals">
              <Car className="w-4 h-4 mr-2" />
              Rentals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="airlines" className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingAirline(!isAddingAirline)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Airline
            </Button>

            {isAddingAirline && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label>Airline</Label>
                  <Input
                    value={airlineData.airline}
                    onChange={(e) => setAirlineData({ ...airlineData, airline: e.target.value })}
                    placeholder="e.g., United Airlines"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Name</Label>
                  <Input
                    value={airlineData.program}
                    onChange={(e) => setAirlineData({ ...airlineData, program: e.target.value })}
                    placeholder="e.g., MileagePlus"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Membership Number</Label>
                  <Input
                    value={airlineData.number}
                    onChange={(e) => setAirlineData({ ...airlineData, number: e.target.value })}
                    placeholder="Your membership number"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddAirline}>Add</Button>
                  <Button variant="outline" onClick={() => setIsAddingAirline(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {airlines?.map((airline) => (
                <div
                  key={airline.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{airline.airline}</p>
                    <p className="text-sm text-muted-foreground">
                      {airline.program_name} • {airline.membership_number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAirline.mutate(airline.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!airlines || airlines.length === 0) && !isAddingAirline && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No airline programs added yet
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="hotels" className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingHotel(!isAddingHotel)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Hotel
            </Button>

            {isAddingHotel && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label>Hotel Chain</Label>
                  <Input
                    value={hotelData.chain}
                    onChange={(e) => setHotelData({ ...hotelData, chain: e.target.value })}
                    placeholder="e.g., Marriott"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Name</Label>
                  <Input
                    value={hotelData.program}
                    onChange={(e) => setHotelData({ ...hotelData, program: e.target.value })}
                    placeholder="e.g., Bonvoy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Membership Number</Label>
                  <Input
                    value={hotelData.number}
                    onChange={(e) => setHotelData({ ...hotelData, number: e.target.value })}
                    placeholder="Your membership number"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddHotel}>Add</Button>
                  <Button variant="outline" onClick={() => setIsAddingHotel(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {hotels?.map((hotel) => (
                <div
                  key={hotel.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{hotel.hotel_chain}</p>
                    <p className="text-sm text-muted-foreground">
                      {hotel.program_name} • {hotel.membership_number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteHotel.mutate(hotel.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!hotels || hotels.length === 0) && !isAddingHotel && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hotel programs added yet
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rentals" className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingRental(!isAddingRental)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Rental
            </Button>

            {isAddingRental && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label>Rental Company</Label>
                  <Input
                    value={rentalData.company}
                    onChange={(e) => setRentalData({ ...rentalData, company: e.target.value })}
                    placeholder="e.g., Hertz"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Name</Label>
                  <Input
                    value={rentalData.program}
                    onChange={(e) => setRentalData({ ...rentalData, program: e.target.value })}
                    placeholder="e.g., Gold Plus Rewards"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Membership Number</Label>
                  <Input
                    value={rentalData.number}
                    onChange={(e) => setRentalData({ ...rentalData, number: e.target.value })}
                    placeholder="Your membership number"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddRental}>Add</Button>
                  <Button variant="outline" onClick={() => setIsAddingRental(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {rentals?.map((rental) => (
                <div
                  key={rental.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{rental.company}</p>
                    <p className="text-sm text-muted-foreground">
                      {rental.program_name} • {rental.membership_number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRental.mutate(rental.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {(!rentals || rentals.length === 0) && !isAddingRental && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No rental programs added yet
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

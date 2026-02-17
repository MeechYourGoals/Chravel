import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Star,
  Plane,
  Car,
  Building,
  CreditCard,
  Wallet,
  Loader2,
} from 'lucide-react';
import { AirlineProgram, HotelProgram, RentalCarProgram } from '../types/pro';
import { PaymentMethodsSettings } from './payments/PaymentMethodsSettings';
import {
  loyaltyProgramService,
  LoyaltyProgram,
  LoyaltyProgramType,
} from '../services/loyaltyProgramService';
import { useToast } from '../hooks/use-toast';

interface TravelWalletProps {
  userId: string;
}

export const TravelWallet = ({ userId }: TravelWalletProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'airlines' | 'hotels' | 'rentals'>('airlines');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [airlinePrograms, setAirlinePrograms] = useState<AirlineProgram[]>([]);
  const [hotelPrograms, setHotelPrograms] = useState<HotelProgram[]>([]);
  const [rentalCarPrograms, setRentalCarPrograms] = useState<RentalCarProgram[]>([]);

  // Load loyalty programs from database
  useEffect(() => {
    const loadPrograms = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const programs = await loyaltyProgramService.getUserPrograms(userId);

        setAirlinePrograms(
          programs
            .filter(p => p.program_type === 'airline')
            .map(loyaltyProgramService.toAirlineProgram),
        );
        setHotelPrograms(
          programs
            .filter(p => p.program_type === 'hotel')
            .map(loyaltyProgramService.toHotelProgram),
        );
        setRentalCarPrograms(
          programs
            .filter(p => p.program_type === 'rental')
            .map(loyaltyProgramService.toRentalCarProgram),
        );
      } catch (error) {
        console.error('Error loading loyalty programs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPrograms();
  }, [userId]);

  const AddProgramForm = ({
    type,
    onSave,
    onCancel,
  }: {
    type: string;
    onSave: (data: any) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      company: '',
      programName: '',
      membershipNumber: '',
      tier: '',
      isPreferred: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        id: Date.now().toString(),
        ...formData,
        [type === 'airlines' ? 'airline' : type === 'hotels' ? 'hotelChain' : 'company']:
          formData.company,
      });
      setFormData({
        company: '',
        programName: '',
        membershipNumber: '',
        tier: '',
        isPreferred: false,
      });
    };

    const getPlaceholders = () => {
      switch (type) {
        case 'airlines':
          return {
            company: 'Delta, American, United, etc.',
            program: 'SkyMiles, AAdvantage, MileagePlus, etc.',
            number: 'Your frequent flyer number',
          };
        case 'hotels':
          return {
            company: 'Marriott, Hilton, Hyatt, etc.',
            program: 'Bonvoy, Honors, World of Hyatt, etc.',
            number: 'Your rewards number',
          };
        case 'rentals':
          return {
            company: 'Hertz, Avis, Enterprise, etc.',
            program: 'Gold Plus Rewards, Preferred, etc.',
            number: 'Your membership number',
          };
        default:
          return { company: '', program: '', number: '' };
      }
    };

    const placeholders = getPlaceholders();

    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-white font-semibold mb-4">Add New {type.slice(0, -1)} Program</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              {type === 'airlines'
                ? 'Airline'
                : type === 'hotels'
                  ? 'Hotel Chain'
                  : 'Rental Company'}
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
              placeholder={placeholders.company}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Program Name</label>
            <input
              type="text"
              value={formData.programName}
              onChange={e => setFormData({ ...formData, programName: e.target.value })}
              placeholder={placeholders.program}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Membership Number</label>
            <input
              type="text"
              value={formData.membershipNumber}
              onChange={e => setFormData({ ...formData, membershipNumber: e.target.value })}
              placeholder={placeholders.number}
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Tier/Status (Optional)</label>
            <input
              type="text"
              value={formData.tier}
              onChange={e => setFormData({ ...formData, tier: e.target.value })}
              placeholder="Gold, Platinum, etc."
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="preferred"
              checked={formData.isPreferred}
              onChange={e => setFormData({ ...formData, isPreferred: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="preferred" className="text-sm text-gray-300">
              Set as preferred
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Save Program
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  };

  const ProgramCard = ({
    program,
    type,
    onEdit,
    onDelete,
  }: {
    program: AirlineProgram | HotelProgram | RentalCarProgram;
    type: string;
    onEdit: () => void;
    onDelete: () => void;
  }) => {
    const getIcon = () => {
      switch (type) {
        case 'airlines':
          return <Plane size={20} className="text-blue-400" />;
        case 'hotels':
          return <Building size={20} className="text-green-400" />;
        case 'rentals':
          return <Car size={20} className="text-purple-400" />;
        default:
          return <CreditCard size={20} className="text-gray-400" />;
      }
    };

    const getCompanyName = () => {
      if ('airline' in program) return program.airline;
      if ('hotelChain' in program) return program.hotelChain;
      return program.company;
    };

    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <h4 className="text-white font-semibold">{getCompanyName()}</h4>
              <p className="text-gray-400 text-sm">{program.programName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {program.isPreferred && <Star size={16} className="text-yellow-500 fill-current" />}
            <button onClick={onEdit} className="text-gray-400 hover:text-white p-1">
              <Edit size={14} />
            </button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-400 p-1">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Number:</span>
            <span className="text-white font-mono">{program.membershipNumber}</span>
          </div>
          {program.tier && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Status:</span>
              <span className="text-glass-orange font-medium">{program.tier}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleAddProgram = async (data: any) => {
    if (!userId) return;

    setIsSaving(true);
    try {
      const programType: LoyaltyProgramType =
        activeTab === 'airlines' ? 'airline' : activeTab === 'hotels' ? 'hotel' : 'rental';

      const companyName = data.airline || data.hotelChain || data.company;

      const result = await loyaltyProgramService.saveProgram(userId, {
        program_type: programType,
        company_name: companyName,
        program_name: data.programName,
        membership_number: data.membershipNumber,
        tier: data.tier,
        is_preferred: data.isPreferred || false,
      });

      if (result) {
        // Add to local state
        switch (activeTab) {
          case 'airlines':
            setAirlinePrograms(prev => [...prev, loyaltyProgramService.toAirlineProgram(result)]);
            break;
          case 'hotels':
            setHotelPrograms(prev => [...prev, loyaltyProgramService.toHotelProgram(result)]);
            break;
          case 'rentals':
            setRentalCarPrograms(prev => [
              ...prev,
              loyaltyProgramService.toRentalCarProgram(result),
            ]);
            break;
        }
        toast({ title: 'Program added', description: 'Your loyalty program has been saved.' });
      } else {
        throw new Error('Failed to save program');
      }
    } catch (error) {
      console.error('Error adding program:', error);
      toast({
        title: 'Error',
        description: 'Failed to save loyalty program. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setShowAddForm(false);
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      const success = await loyaltyProgramService.deleteProgram(programId);
      if (success) {
        switch (activeTab) {
          case 'airlines':
            setAirlinePrograms(prev => prev.filter(p => p.id !== programId));
            break;
          case 'hotels':
            setHotelPrograms(prev => prev.filter(p => p.id !== programId));
            break;
          case 'rentals':
            setRentalCarPrograms(prev => prev.filter(p => p.id !== programId));
            break;
        }
        toast({ title: 'Program removed', description: 'The loyalty program has been deleted.' });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting program:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete loyalty program. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getCurrentPrograms = () => {
    switch (activeTab) {
      case 'airlines':
        return airlinePrograms;
      case 'hotels':
        return hotelPrograms;
      case 'rentals':
        return rentalCarPrograms;
      default:
        return [];
    }
  };

  const tabs = [
    { id: 'airlines', label: 'Airlines', icon: Plane, count: airlinePrograms.length },
    { id: 'hotels', label: 'Hotels', icon: Building, count: hotelPrograms.length },
    { id: 'rentals', label: 'Car Rentals', icon: Car, count: rentalCarPrograms.length },
  ];

  return (
    <div className="space-y-6">
      {/* Loyalty Programs */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet size={24} className="text-glass-orange" />
            Loyalty Programs
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus size={16} />
            Add Program
          </button>
        </div>

        {/* Tabs - stack on mobile, horizontal on larger screens; ensure all fit within box */}
        <div className="flex flex-col sm:flex-row sm:border-b border-white/20 mb-6 gap-0 overflow-hidden">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-medium transition-colors min-w-0 shrink-0 ${
                  activeTab === tab.id
                    ? 'text-glass-orange sm:border-b-2 sm:border-glass-orange bg-white/5 sm:bg-transparent'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={16} className="shrink-0 sm:w-[18px] sm:h-[18px]" />
                <span className="truncate">{tab.label}</span>
                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full shrink-0">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6">
            <AddProgramForm
              type={activeTab}
              onSave={handleAddProgram}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {/* Programs Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading programs...</span>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {getCurrentPrograms().map(program => (
              <ProgramCard
                key={program.id}
                program={program}
                type={activeTab}
                onEdit={() => {
                  /* TODO: Implement edit */
                }}
                onDelete={() => handleDeleteProgram(program.id)}
              />
            ))}
          </div>
        )}

        {!isLoading && getCurrentPrograms().length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">No {activeTab} programs added yet</div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-glass-orange hover:bg-glass-orange/80 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Add Your First Program
            </button>
          </div>
        )}
      </div>

      {/* Payment Methods for Trip Expenses */}
      <PaymentMethodsSettings userId={userId} />
    </div>
  );
};

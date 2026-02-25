/**
 * CurrencySelector Component
 *
 * Enhanced currency selector with:
 * - Comprehensive currency list (40+ currencies)
 * - Regional grouping
 * - Search functionality
 * - Popular currencies quick access
 * - Currency symbols and formatting
 */

import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  CURRENCIES,
  POPULAR_CURRENCIES,
  CURRENCY_REGIONS,
  getCurrency,
} from '@/constants/currencies';
import { cn } from '@/lib/utils';

export interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCurrency = getCurrency(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-12 rounded-xl bg-gray-900/40 border-white/10 text-white hover:bg-gray-800/60',
            className,
          )}
        >
          {selectedCurrency ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-lg">{selectedCurrency.symbol}</span>
              <span>{selectedCurrency.code}</span>
              <span className="text-sm text-gray-400">({selectedCurrency.name})</span>
            </span>
          ) : (
            <span className="text-gray-500">Select currency...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-gray-900 border-white/10" align="start">
        <Command className="bg-gray-900">
          <CommandInput
            placeholder="Search currencies..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-none focus:ring-0 text-white placeholder-gray-500"
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-gray-400">
              No currency found.
            </CommandEmpty>

            {/* Popular Currencies */}
            {!searchQuery && (
              <>
                <CommandGroup heading="Popular" className="text-gray-400">
                  {POPULAR_CURRENCIES.map(code => {
                    const currency = getCurrency(code);
                    if (!currency) return null;
                    return (
                      <CommandItem
                        key={code}
                        value={`${code} ${currency.name} ${currency.symbol}`}
                        onSelect={() => {
                          onChange(code);
                          setOpen(false);
                        }}
                        className="cursor-pointer hover:bg-gray-800 text-white"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === code ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="font-mono text-lg mr-2 w-8">{currency.symbol}</span>
                        <span className="font-semibold mr-2">{currency.code}</span>
                        <span className="text-sm text-gray-400">{currency.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator className="bg-white/10" />
              </>
            )}

            {/* Grouped by Region */}
            {Object.entries(CURRENCY_REGIONS).map(([region, codes]) => {
              const regionCurrencies = codes.map(code => getCurrency(code)).filter(Boolean);

              // Filter by search query if present
              const filteredCurrencies = searchQuery
                ? regionCurrencies.filter(
                    c =>
                      c!.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c!.name.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                : regionCurrencies;

              if (filteredCurrencies.length === 0) return null;

              return (
                <React.Fragment key={region}>
                  <CommandGroup heading={region} className="text-gray-400">
                    {filteredCurrencies.map(currency => {
                      if (!currency) return null;
                      return (
                        <CommandItem
                          key={currency.code}
                          value={`${currency.code} ${currency.name} ${currency.symbol}`}
                          onSelect={() => {
                            onChange(currency.code);
                            setOpen(false);
                          }}
                          className="cursor-pointer hover:bg-gray-800 text-white"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              value === currency.code ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span className="font-mono text-lg mr-2 w-8">{currency.symbol}</span>
                          <span className="font-semibold mr-2">{currency.code}</span>
                          <span className="text-sm text-gray-400">{currency.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  {region !== 'Cryptocurrency' && <CommandSeparator className="bg-white/10" />}
                </React.Fragment>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

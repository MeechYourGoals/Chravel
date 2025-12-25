import React, { useCallback, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { platformClipboard } from '@/platform/clipboard';
import { maskPaymentIdentifier, type PaymentIdentifierType } from '@/utils/paymentIdentifierMasking';

export interface PaymentIdentifierCopyProps {
  identifier: string;
  methodType?: PaymentIdentifierType;
  methodLabel?: string;
  className?: string;
  maskedClassName?: string;
  buttonVariant?: 'ghost' | 'outline';
  buttonSize?: 'icon' | 'sm';
}

export function PaymentIdentifierCopy({
  identifier,
  methodType,
  methodLabel,
  className,
  maskedClassName,
  buttonVariant = 'ghost',
  buttonSize = 'icon',
}: PaymentIdentifierCopyProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const masked = useMemo(() => maskPaymentIdentifier(identifier, methodType), [identifier, methodType]);

  const handleCopy = useCallback(async () => {
    const raw = identifier.trim();
    if (!raw) return;

    const result = await platformClipboard.copy(raw);
    if (!result.success) {
      toast({
        title: 'Copy failed',
        description: result.error ?? 'Unable to copy to clipboard.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Copied',
      description: 'Full payment identifier copied to clipboard.',
      variant: 'default',
    });

    setOpen(false);
    setAcknowledged(false);
  }, [identifier]);

  if (!identifier.trim()) {
    return <span className={className ?? ''}>—</span>;
  }

  return (
    <>
      <span className={className ?? 'inline-flex items-center gap-1'}>
        <span className={maskedClassName ?? ''}>{masked}</span>
        <Button
          type="button"
          variant={buttonVariant}
          size={buttonSize}
          className={buttonSize === 'icon' ? 'h-6 w-6' : undefined}
          onClick={() => setOpen(true)}
          aria-label="Copy full payment identifier"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy full payment identifier?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will copy the full {methodLabel ?? methodType ?? 'payment'} identifier to your clipboard. Only do
              this if you trust your surroundings and device.
            </p>

            <div className="flex items-start gap-2">
              <Checkbox
                id="acknowledge-copy-payment-identifier"
                checked={acknowledged}
                onCheckedChange={checked => setAcknowledged(checked === true)}
              />
              <Label htmlFor="acknowledge-copy-payment-identifier" className="text-sm leading-5">
                I understand this copies sensitive information.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCopy} disabled={!acknowledged}>
              Reveal &amp; Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


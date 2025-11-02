import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id} className={cn(error && 'text-destructive')}>
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        
        <Input
          ref={ref}
          className={cn(
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined}
          {...props}
        />
        
        {hint && !error && (
          <p id={`${props.id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        
        {error && (
          <p id={`${props.id}-error`} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

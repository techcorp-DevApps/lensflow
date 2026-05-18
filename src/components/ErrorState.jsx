import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorState({ title = 'Something went wrong', error, onRetry }) {
  const message =
    (error && (error.message || (typeof error === 'string' ? error : null))) ||
    'We were unable to load this data. Please try again.';
  return (
    <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 text-destructive/70" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

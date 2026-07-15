'use client';

import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';

import { useBorrowContext } from '@/components/borrow-context';
import { Button } from '@/components/ui/button';

export interface PlatformWalletAddressProps {
  label?: string;
  className?: string;
}

export function PlatformWalletAddress({
  label = 'Platform',
  className,
}: PlatformWalletAddressProps) {
  const { sdk, state } = useBorrowContext();
  const [address, setAddress] = useState<string | null>(sdk.platformWalletAddress);

  useEffect(() => {
    if (state.phase === 'idle' || state.phase === 'session_setup') return;

    let cancelled = false;
    void sdk.ensurePlatformWallet()
      .then((platformAddress) => {
        if (!cancelled) setAddress(platformAddress);
      })
      .catch(() => {
        if (!cancelled) setAddress(null);
      });

    return () => {
      cancelled = true;
    };
  }, [sdk, state.phase]);

  if (!address) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      title={`${label} wallet: ${address}`}
      onClick={() => void navigator.clipboard.writeText(address)}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="font-mono">{shortAddress(address)}</span>
      <Copy />
    </Button>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

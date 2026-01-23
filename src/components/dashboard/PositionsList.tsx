import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBorrowSDK } from '@/hooks/useBorrowSDK';
import { RefreshCw, Loader2, Coins } from 'lucide-react';

export function PositionsList() {
  const { isConnected, walletPositions, getWalletPositions, portfolioLoading } = useBorrowSDK();

  useEffect(() => {
    if (isConnected) {
      getWalletPositions();
    }
  }, [isConnected, getWalletPositions]);

  // Handle both array and wrapped { data: [...] } response
  const positions = Array.isArray(walletPositions)
    ? walletPositions
    : (walletPositions?.data ?? []);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>Connect wallet to view</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Positions</CardTitle>
            <CardDescription>Your token holdings</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => getWalletPositions()} disabled={portfolioLoading}>
            {portfolioLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {positions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.slice(0, 10).map((position: any) => {
                const fungibleInfo = position.attributes.fungible_info;
                const symbol = fungibleInfo?.symbol || 'Unknown';
                const name = fungibleInfo?.name || position.attributes.name;
                const quantity = position.attributes.quantity?.float || 0;
                const value = position.attributes.value;
                const price = position.attributes.price || 0;
                const chain = position.relationships?.chain?.data?.id || 'unknown';

                return (
                  <TableRow key={position.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{symbol}</p>
                          <p className="text-xs text-muted-foreground">{name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {chain}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <p>{quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</p>
                      <p className="text-xs text-muted-foreground">
                        @${price.toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {value !== null ? `$${value.toLocaleString()}` : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No positions found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface BalanceSheetProps {
  asOfDate: Date;
  cashBalance: number;
  accountsReceivable: number;
  inventoryValue: number;
  totalAssets: number;
  accountsPayable: number;
  totalLiabilities: number;
  retainedEarnings: number;
  totalEquity: number;
}

export function BalanceSheet({
  asOfDate,
  cashBalance,
  accountsReceivable,
  inventoryValue,
  totalAssets,
  accountsPayable,
  totalLiabilities,
  retainedEarnings,
  totalEquity,
}: BalanceSheetProps) {
  return (
    <Card variant="elevated" className="print:shadow-none">
      <CardHeader className="pb-2 border-b">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance Sheet</p>
          <CardTitle className="text-lg md:text-xl">Statement of Financial Position</CardTitle>
          <p className="text-sm text-muted-foreground">As of {format(asOfDate, 'MMMM d, yyyy')}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 text-sm">
        {/* Assets - REMOVED CALCULATIONS */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Assets</h4>
          <div className="pl-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Current Assets</p>
            <div className="flex justify-between py-1 border-b">
              <span className="pl-2">Cash & Cash Equivalents</span>
              <span className="font-mono">KSh {cashBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="pl-2">Accounts Receivable</span>
              <span className="font-mono">KSh {accountsReceivable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="pl-2">Inventory</span>
              <span className="font-mono">KSh {inventoryValue.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between py-2 font-bold bg-primary/10 px-2 rounded mt-2">
            <span>Total Assets</span>
            <span className="font-mono">KSh {totalAssets.toLocaleString()}</span>
          </div>
        </div>

        {/* Liabilities - REMOVED CALCULATIONS */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Liabilities</h4>
          <div className="pl-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Current Liabilities</p>
            <div className="flex justify-between py-1 border-b">
              <span className="pl-2">Accounts Payable</span>
              <span className="font-mono">KSh {accountsPayable.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between py-2 font-semibold bg-secondary/30 px-2 rounded mt-2">
            <span>Total Liabilities</span>
            <span className="font-mono">KSh {totalLiabilities.toLocaleString()}</span>
          </div>
        </div>

        {/* Equity - REMOVED CALCULATIONS */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Owner's Equity</h4>
          <div className="flex justify-between py-1 border-b">
            <span className="pl-2">Retained Earnings</span>
            <span className={`font-mono ${retainedEarnings >= 0 ? 'text-success' : 'text-destructive'}`}>
              KSh {retainedEarnings.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between py-2 font-semibold bg-secondary/30 px-2 rounded mt-2">
            <span>Total Equity</span>
            <span className="font-mono">KSh {totalEquity.toLocaleString()}</span>
          </div>
        </div>

        {/* Balance Check - CALCULATION REMOVED, USE FROM PROPS */}
        <div className="flex justify-between py-3 font-bold text-lg border-2 border-primary px-3 rounded-lg bg-primary/5">
          <span>Total Liabilities + Equity</span>
          <span className="font-mono">KSh {(totalLiabilities + totalEquity).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
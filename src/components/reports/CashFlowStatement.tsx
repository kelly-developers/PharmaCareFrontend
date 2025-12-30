import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface CashFlowStatementProps {
  period: string;
  dateRange: { start: Date; end: Date };
  salesCashInflow: number;
  inventoryPurchases: number;
  operatingExpenses: number;
  netOperatingCashFlow: number;
  netCashFlow: number;
  openingCashBalance: number;
  closingCashBalance: number;
}

export function CashFlowStatement({
  period,
  dateRange,
  salesCashInflow,
  inventoryPurchases,
  operatingExpenses,
  netOperatingCashFlow,
  netCashFlow,
  openingCashBalance,
  closingCashBalance,
}: CashFlowStatementProps) {
  const periodLabel = period === 'month' 
    ? format(dateRange.start, 'MMMM yyyy')
    : period === 'year' 
    ? format(dateRange.start, 'yyyy')
    : `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;

  return (
    <Card variant="elevated" className="print:shadow-none">
      <CardHeader className="pb-2 border-b">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cash Flow Statement</p>
          <CardTitle className="text-lg md:text-xl">Statement of Cash Flows</CardTitle>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 text-sm">
        {/* Operating Activities - REMOVED CALCULATIONS */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">
            Cash Flows from Operating Activities
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between py-1 border-b">
              <span className="pl-2">Cash received from sales</span>
              <span className="font-mono text-success">KSh {salesCashInflow.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="pl-2">Inventory purchases</span>
              <span className="font-mono text-destructive">(KSh {inventoryPurchases.toLocaleString()})</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="pl-2">Operating expenses paid</span>
              <span className="font-mono text-destructive">(KSh {operatingExpenses.toLocaleString()})</span>
            </div>
          </div>
          <div className={`flex justify-between py-2 font-semibold px-2 rounded mt-2 ${
            netOperatingCashFlow >= 0 ? 'bg-success/10' : 'bg-destructive/10'
          }`}>
            <span>Net Cash from Operating Activities</span>
            <span className={`font-mono ${netOperatingCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
              KSh {netOperatingCashFlow.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Investing Activities - REMOVED CALCULATIONS */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">
            Cash Flows from Investing Activities
          </h4>
          <div className="flex justify-between py-1 border-b text-muted-foreground">
            <span className="pl-2">No investing activities</span>
            <span className="font-mono">KSh 0</span>
          </div>
          <div className="flex justify-between py-2 font-semibold bg-secondary/30 px-2 rounded mt-2">
            <span>Net Cash from Investing</span>
            <span className="font-mono">KSh 0</span>
          </div>
        </div>

        {/* Financing Activities - REMOVED CALCULATIONS */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">
            Cash Flows from Financing Activities
          </h4>
          <div className="flex justify-between py-1 border-b text-muted-foreground">
            <span className="pl-2">No financing activities</span>
            <span className="font-mono">KSh 0</span>
          </div>
          <div className="flex justify-between py-2 font-semibold bg-secondary/30 px-2 rounded mt-2">
            <span>Net Cash from Financing</span>
            <span className="font-mono">KSh 0</span>
          </div>
        </div>

        {/* Net Change - REMOVED CALCULATIONS */}
        <div className={`flex justify-between py-2 font-bold border-t border-b px-2 ${
          netCashFlow >= 0 ? 'bg-success/10' : 'bg-destructive/10'
        }`}>
          <span>Net Change in Cash</span>
          <span className={`font-mono ${netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
            KSh {netCashFlow.toLocaleString()}
          </span>
        </div>

        {/* Cash Summary - REMOVED CALCULATIONS */}
        <div className="space-y-1">
          <div className="flex justify-between py-1">
            <span>Opening Cash Balance</span>
            <span className="font-mono">KSh {openingCashBalance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-3 font-bold text-lg border-2 border-primary px-3 rounded-lg bg-primary/5">
            <span>Closing Cash Balance</span>
            <span className="font-mono">KSh {closingCashBalance.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
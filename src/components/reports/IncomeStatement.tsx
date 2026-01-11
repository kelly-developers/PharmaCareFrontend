import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface IncomeStatementProps {
  period: string;
  dateRange: { start: Date; end: Date };
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: { category: string; amount: number }[];
  totalExpenses: number;
  netProfit: number;
}

export function IncomeStatement({
  period,
  dateRange,
  revenue,
  cogs,
  grossProfit,
  expenses,
  totalExpenses,
  netProfit,
}: IncomeStatementProps) {
  const periodLabel = period === 'month' 
    ? format(dateRange.start, 'MMMM yyyy')
    : period === 'year' 
    ? format(dateRange.start, 'yyyy')
    : `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;

  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return (
    <Card variant="elevated" className="print:shadow-none">
      <CardHeader className="pb-2 border-b">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Income Statement</p>
          <CardTitle className="text-lg md:text-xl">Profit & Loss Statement</CardTitle>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 text-sm">
        {/* Revenue Section */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Revenue</h4>
          <div className="flex justify-between py-1 border-b">
            <span>Sales Revenue</span>
            <span className="font-mono">KSh {revenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-1 font-semibold bg-secondary/30 px-2 rounded">
            <span>Total Revenue</span>
            <span className="font-mono">KSh {revenue.toLocaleString()}</span>
          </div>
        </div>

        {/* COGS Section */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Cost of Goods Sold</h4>
          <div className="flex justify-between py-1 border-b">
            <span>Inventory Cost</span>
            <span className="font-mono text-destructive">(KSh {cogs.toLocaleString()})</span>
          </div>
          <div className="flex justify-between py-1 font-semibold bg-secondary/30 px-2 rounded">
            <span>Total COGS</span>
            <span className="font-mono text-destructive">(KSh {cogs.toLocaleString()})</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="flex justify-between py-2 font-bold text-base border-t border-b bg-primary/10 px-2 rounded">
          <span>Gross Profit</span>
          <div className="text-right">
            <span className={`font-mono block ${grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              KSh {grossProfit.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">
              {revenue > 0 ? `Margin: ${((grossProfit / revenue) * 100).toFixed(1)}%` : 'Margin: 0%'}
            </span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div>
          <h4 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Operating Expenses</h4>
          {expenses.length > 0 ? (
            expenses.map((exp, idx) => (
              <div key={idx} className="flex justify-between py-1 border-b">
                <span className="capitalize">{exp.category}</span>
                <span className="font-mono text-destructive">(KSh {exp.amount.toLocaleString()})</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between py-1 border-b text-muted-foreground">
              <span>No expenses recorded</span>
              <span className="font-mono">KSh 0</span>
            </div>
          )}
          <div className="flex justify-between py-1 font-semibold bg-secondary/30 px-2 rounded">
            <span>Total Operating Expenses</span>
            <span className="font-mono text-destructive">(KSh {totalExpenses.toLocaleString()})</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`flex justify-between py-3 font-bold text-lg border-2 px-3 rounded-lg ${
          netProfit >= 0 ? 'border-success bg-success/10' : 'border-destructive bg-destructive/10'
        }`}>
          <div>
            <span>Net Profit / (Loss)</span>
            {profitMargin !== 0 && (
              <p className="text-xs font-normal mt-1">
                {netProfit >= 0 ? 'Profit' : 'Loss'} Margin: {Math.abs(profitMargin).toFixed(1)}%
              </p>
            )}
          </div>
          <div className="text-right">
            <span className={`font-mono block ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              KSh {netProfit.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
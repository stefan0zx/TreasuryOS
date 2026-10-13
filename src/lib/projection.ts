export interface ProjectionResult {
  finalAmount: number;
  totalGain: number;
  yearlySeries: Array<{ year: number; value: number }>;
}

export function projectGrowth(amount: number, apyPercent: number, years: number): ProjectionResult {
  const principal = Math.max(0, isNaN(amount) ? 0 : amount);
  const apy = Math.max(0, isNaN(apyPercent) ? 0 : apyPercent);
  const nYears = Math.max(0, isNaN(years) ? 0 : years);

  const yearlySeries: Array<{ year: number; value: number }> = [];
  yearlySeries.push({ year: 0, value: principal });

  let current = principal;
  for (let y = 1; y <= nYears; y++) {
    current = current * (1 + apy / 100);
    yearlySeries.push({ year: y, value: Number(current.toFixed(4)) });
  }

  const finalAmount = Number(current.toFixed(4));
  const totalGain = Number((finalAmount - principal).toFixed(4));

  return {
    finalAmount,
    totalGain,
    yearlySeries
  };
}

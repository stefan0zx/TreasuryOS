export function accruedYield(deployedSol: number, apy: number, createdAt: number, now = Date.now()): number {
  if (deployedSol <= 0 || apy <= 0 || createdAt <= 0 || now <= createdAt) return 0;
  const years = (now - createdAt) / (365 * 24 * 60 * 60 * 1000);
  return deployedSol * (apy / 100) * years;
}

export function periodYield(deployedSol: number, apy: number, createdAt: number, rangeStart: number, now = Date.now()): number {
  if (deployedSol <= 0 || apy <= 0 || createdAt <= 0) return 0;
  const effectiveStart = Math.max(rangeStart, createdAt);
  if (now <= effectiveStart) return 0;
  const yieldAtNow = accruedYield(deployedSol, apy, createdAt, now);
  const yieldAtStart = accruedYield(deployedSol, apy, createdAt, effectiveStart);
  return Math.max(0, yieldAtNow - yieldAtStart);
}

export function returnPercentage(deployedSol: number, apy: number, createdAt: number, rangeStart: number, now = Date.now()): number {
  if (deployedSol <= 0 || apy <= 0 || createdAt <= 0 || (now - createdAt < 60000)) return 0;
  const earned = periodYield(deployedSol, apy, createdAt, rangeStart, now);
  return (earned / deployedSol) * 100;
}

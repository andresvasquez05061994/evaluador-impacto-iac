import { useMemo } from 'react'
import { calculateImpact } from '../utils/calculateImpact'

export function useImpactCalculations(params) {
  return useMemo(() => calculateImpact(params), [
    params.prov,
    params.hrs,
    params.errPct,
    params.costHr,
    params.tRed,
    params.eRed,
    params.impl,
    params.monthly,
    params.docsPerReg,
    params.aiData,
    params.customCostItems,
    params.customVolumeItems,
  ])
}

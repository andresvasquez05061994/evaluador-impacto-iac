import { C } from './colors'

export const SEV_BORDER = { CRÍTICO: C.coral, ALTO: C.coral, MEDIO: C.amber, BAJO: C.teal }
export const SEV_BG = {
  CRÍTICO: 'rgba(216,90,48,.15)',
  ALTO: 'rgba(216,90,48,.1)',
  MEDIO: 'rgba(239,159,39,.1)',
  BAJO: 'rgba(29,158,117,.1)',
}
export const SEV_COLOR = { CRÍTICO: C.coral, ALTO: C.coral, MEDIO: C.amber, BAJO: C.teal }

export const RISK_LVL_BG = {
  CRÍTICO: '#7B1818',
  ALTO: '#993C1D',
  MEDIO: '#6B5A10',
  BAJO: '#0F6E56',
  'MUY BAJO': '#085041',
  'N/A': C.dark4,
}
export const RISK_LVL_TXT = {
  CRÍTICO: '#F09595',
  ALTO: '#F0997B',
  MEDIO: '#FAC775',
  BAJO: '#5DCAA5',
  'MUY BAJO': '#9FE1CB',
  'N/A': C.gray,
}

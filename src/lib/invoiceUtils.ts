import type { AppSettings } from '../types';

export function getNextInvoiceNumber(settings: AppSettings): string {
  const nextCounter = settings.invoiceCounter + 1;
  return `${settings.invoicePrefix}-${nextCounter.toString().padStart(6, '0')}`;
}

export function generateNextInvoiceNumber(
  settings: AppSettings
): { invoiceNumber: string; newCounter: number } {
  const newCounter = settings.invoiceCounter + 1;
  const invoiceNumber = `${settings.invoicePrefix}-${newCounter.toString().padStart(6, '0')}`;
  return { invoiceNumber, newCounter };
}

type InvoiceSettingsDispatch = (
  action:
    | { type: 'INCREMENT_INVOICE_COUNTER'; payload: number }
    | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
) => void;

export function resetInvoiceCounter(
  dispatch: InvoiceSettingsDispatch,
  newCounter = 0
): void {
  dispatch({ type: 'INCREMENT_INVOICE_COUNTER', payload: newCounter });
}

export function setInvoicePrefix(
  dispatch: InvoiceSettingsDispatch,
  prefix: string
): void {
  dispatch({ type: 'SET_SETTINGS', payload: { invoicePrefix: prefix } });
}

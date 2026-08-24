export interface PrintHeaderProps {
  businessName: string
  address?: string
  panVat?: string
  yearLabel: string
  dateFrom: string
  dateTo: string
}

export function PrintHeader({
  businessName,
  address,
  panVat,
  yearLabel,
  dateFrom,
  dateTo
}: PrintHeaderProps) {
  return (
    <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
      <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-900 text-center mb-6">
        Business Intelligence & Audit Center
      </h1>
      
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{businessName}</h2>
          {address && <p className="text-slate-600">{address}</p>}
          {panVat && <p className="text-slate-600">PAN/VAT: {panVat}</p>}
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-900">Financial Year: {yearLabel}</p>
          <p className="text-sm text-slate-600">
            Report Period: {new Date(dateFrom).toLocaleDateString()} &rarr; {new Date(dateTo).toLocaleDateString()}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Generated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

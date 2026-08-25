"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  ListChecks,
} from 'lucide-react'
import Link from 'next/link'
import { BusinessHealthSummary, IssueSeverity } from '@/lib/report-auditor'
import { formatCurrency } from '@/lib/utils'

export interface WhatNeedsAttentionProps {
  summary: BusinessHealthSummary
  onSwitchToAccountantView?: () => void
}

export function WhatNeedsAttention({ summary, onSwitchToAccountantView }: WhatNeedsAttentionProps) {
  const [filter, setFilter] = useState<'all' | 'action_required' | 'needs_review' | 'info'>('all')
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null)

  const filteredIssues = summary.issues.filter((issue) => {
    if (filter === 'all') return true
    return issue.severity === filter
  })

  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'ok':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs gap-1 hover:bg-emerald-100">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> OK
          </Badge>
        )
      case 'needs_review':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs gap-1 hover:bg-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Needs Review
          </Badge>
        )
      case 'action_required':
        return (
          <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold text-xs gap-1 hover:bg-rose-100">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Action Required
          </Badge>
        )
      case 'info':
        return (
          <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-bold text-xs gap-1 hover:bg-blue-100">
            <Info className="h-3.5 w-3.5 text-blue-600" /> Information
          </Badge>
        )
    }
  }

  const getHeaderIcon = () => {
    if (summary.overallStatus === 'ok') {
      return <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
    }
    if (summary.overallStatus === 'needs_review') {
      return <AlertTriangle className="h-7 w-7 text-amber-600 shrink-0" />
    }
    return <AlertCircle className="h-7 w-7 text-rose-600 shrink-0" />
  }

  const toggleExpand = (id: string) => {
    setExpandedIssueId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-4">
      {/* 1. BUSINESS HEALTH & DATA QUALITY HERO CARD */}
      <Card
        className={`border-l-4 shadow-xs rounded-xl overflow-hidden transition-all ${
          summary.overallStatus === 'ok'
            ? 'border-l-emerald-500 bg-emerald-50/20 border-slate-200'
            : summary.overallStatus === 'needs_review'
            ? 'border-l-amber-500 bg-amber-50/20 border-slate-200'
            : 'border-l-rose-500 bg-rose-50/20 border-slate-200'
        }`}
      >
        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Status Header */}
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border shrink-0 ${
                  summary.overallStatus === 'ok'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : summary.overallStatus === 'needs_review'
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-rose-100 text-rose-700 border-rose-200'
                }`}
              >
                {getHeaderIcon()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900">Business Health</h2>
                  <span className="text-xs font-semibold text-slate-500">(व्यापारिक स्थिति)</span>
                </div>
                <p
                  className={`text-base font-bold mt-0.5 ${
                    summary.overallStatus === 'ok'
                      ? 'text-emerald-700'
                      : summary.overallStatus === 'needs_review'
                      ? 'text-amber-800'
                      : 'text-rose-800'
                  }`}
                >
                  {summary.overallStatus === 'ok' ? (
                    '🟢 Everything looks good'
                  ) : summary.overallStatus === 'needs_review' ? (
                    `🟡 ${summary.issuesCount.needs_review} thing(s) need review`
                  ) : (
                    `🔴 ${summary.issuesCount.action_required} action required item(s)`
                  )}
                </p>
              </div>
            </div>

            {/* Report Data Quality Badge */}
            <div className="flex flex-col items-start sm:items-end gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <ShieldCheck className="h-4 w-4 text-indigo-600" /> Report Data Quality:
              </div>
              <Badge
                className={`text-xs font-bold px-2.5 py-1 ${
                  summary.dataQuality === 'good'
                    ? 'bg-emerald-600 text-white'
                    : summary.dataQuality === 'review_recommended'
                    ? 'bg-amber-500 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {summary.dataQuality === 'good'
                  ? '🟢 Good'
                  : summary.dataQuality === 'review_recommended'
                  ? '🟡 Review Recommended'
                  : '🔴 Incomplete'}
              </Badge>
              <p className="text-[11px] text-slate-500 text-right max-w-xs">{summary.dataQualityMessage}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-5 px-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
            Inventory Lite scans your sales, invoices, customer credit, expenses, and inventory values to keep your financial records clean and audit-ready.
          </p>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-white p-3 rounded-lg border border-slate-200/90 text-center">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Consistent Checks</span>
              <span className="text-lg font-extrabold text-emerald-600">{summary.issuesCount.ok}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/90 text-center">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Needs Review</span>
              <span className="text-lg font-extrabold text-amber-600">{summary.issuesCount.needs_review}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/90 text-center">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Action Required</span>
              <span className="text-lg font-extrabold text-rose-600">{summary.issuesCount.action_required}</span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/90 text-center">
              <span className="text-[11px] font-bold text-slate-500 block uppercase">Information</span>
              <span className="text-lg font-extrabold text-blue-600">{summary.issuesCount.info}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. WHAT NEEDS ATTENTION SECTION */}
      <Card className="border border-slate-200 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-indigo-600" />
                What Needs Attention?
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Every item below explains what happened, why it matters, and how to fix it in simple steps.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg self-start sm:self-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({summary.issues.length})
              </button>
              {summary.issuesCount.action_required > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('action_required')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filter === 'action_required'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Action ({summary.issuesCount.action_required})
                </button>
              )}
              {summary.issuesCount.needs_review > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('needs_review')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filter === 'needs_review'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Review ({summary.issuesCount.needs_review})
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No issues found in this category.</p>
              <p className="text-xs text-slate-500 mt-1">Your business records in this selection are consistent.</p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const isExpanded = expandedIssueId === issue.id || issue.severity === 'action_required'

              return (
                <div
                  key={issue.id}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    issue.severity === 'action_required'
                      ? 'border-rose-200 bg-rose-50/30'
                      : issue.severity === 'needs_review'
                      ? 'border-amber-200 bg-amber-50/20'
                      : issue.severity === 'info'
                      ? 'border-blue-200 bg-blue-50/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Issue Item Header */}
                  <div
                    onClick={() => toggleExpand(issue.id)}
                    className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-black/5 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSeverityBadge(issue.severity)}
                        <h3 className="text-sm font-extrabold text-slate-900">{issue.title}</h3>
                        {issue.titleNe && (
                          <span className="text-xs font-semibold text-slate-500">({issue.titleNe})</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{issue.summary}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {issue.affectedCount > 0 && (
                        <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                          {issue.affectedCount} record(s)
                        </span>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Explanation & Action Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-5 pt-2 border-t border-slate-200/70 space-y-4 text-xs sm:text-sm bg-white">
                      {/* What happened & Why shown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
                          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-indigo-700">
                            <HelpCircle className="h-3.5 w-3.5" /> What happened?
                          </h4>
                          <p className="text-slate-700 leading-relaxed">{issue.whatHappened}</p>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
                          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-indigo-700">
                            <Info className="h-3.5 w-3.5" /> Why am I seeing this?
                          </h4>
                          <p className="text-slate-700 leading-relaxed">{issue.whyShown}</p>
                        </div>
                      </div>

                      {/* Recommended Steps */}
                      {issue.actionSteps.length > 0 && (
                        <div className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-lg space-y-2">
                          <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <ListChecks className="h-4 w-4 text-indigo-700" /> Recommended Action Steps
                          </h4>
                          <ol className="list-decimal list-inside space-y-1 text-slate-800 font-medium text-xs sm:text-sm">
                            {issue.actionSteps.map((step, idx) => (
                              <li key={idx} className="leading-relaxed">
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Affected Records Direct Links */}
                      {issue.affectedRecords.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
                            <span>Direct Link to Affected Record(s):</span>
                            <span className="text-slate-500 font-normal">
                              Showing {issue.affectedRecords.length} record(s)
                            </span>
                          </h4>

                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {issue.affectedRecords.map((rec) => (
                              <div
                                key={`${rec.type}-${rec.id}`}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-colors gap-2"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{rec.label}</span>
                                    {rec.details?.difference !== undefined && (
                                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                        Diff: {formatCurrency(rec.details.difference)}
                                      </span>
                                    )}
                                  </div>
                                  {rec.subLabel && <p className="text-xs text-slate-500">{rec.subLabel}</p>}
                                  {rec.details?.expected !== undefined && rec.details?.recorded !== undefined && (
                                    <p className="text-[11px] font-mono text-slate-600">
                                      Bill Total: {formatCurrency(rec.details.expected)} | Payment Recorded:{' '}
                                      {formatCurrency(rec.details.recorded)}
                                    </p>
                                  )}
                                </div>

                                <Link
                                  href={rec.url}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
                                >
                                  {rec.type === 'sale'
                                    ? 'View Sale'
                                    : rec.type === 'invoice'
                                    ? 'View Invoice'
                                    : rec.type === 'customer'
                                    ? 'View Customer'
                                    : 'View Record'}{' '}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Optional switch to accountant mode */}
                      {onSwitchToAccountantView && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={onSwitchToAccountantView}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 underline"
                          >
                            Open Detailed Accountant View <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

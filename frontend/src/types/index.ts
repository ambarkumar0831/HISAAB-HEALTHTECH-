export interface BillItemExtract {
  item_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total?: number | null;
  category?: string | null;
  confidence?: number | null;
}

export interface BillExtraction {
  hospital_name?: string | null;
  hospital_address?: string | null;
  patient_name?: string | null;
  patient_id?: string | null;
  bill_number?: string | null;
  bill_date?: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
  items: BillItemExtract[];
  subtotal?: number | null;
  discount?: number | null;
  tax?: number | null;
  grand_total?: number | null;
  currency?: string;
  payment_info?: string | null;
  miscellaneous_charges?: string | null;
  uncertain_fields: string[];
  extraction_method: string;
}

export interface AuditFinding {
  id: string;
  finding_type: string;
  title: string;
  description?: string | null;
  reason_code?: string | null;
  severity: string;
  confidence?: number | null;
  expected_value?: number | null;
  actual_value?: number | null;
  estimated_difference?: number | null;
  bill_item_id?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  source_date?: string | null;
  applicability_notes?: string | null;
  status: string;
}

export interface BillItemOut {
  id: string;
  description?: string | null;
  service_date?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  billed_total?: number | null;
  expected_total?: number | null;
  extraction_confidence?: number | null;
  position: number;
  category?: string | null;
  is_flagged: boolean;
}

export interface AuditOut {
  id: string;
  hospital_name?: string | null;
  bill_number?: string | null;
  bill_date?: string | null;
  patient_name?: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
  original_total?: number | null;
  calculated_total?: number | null;
  subtotal?: number | null;
  discount?: number | null;
  tax?: number | null;
  uncertain_fields: string[];
  benchmark_review?: {
    benchmarks_checked: number;
    source_name?: string | null;
    source_url?: string | null;
    comparisons: Array<{
      bill_item_index: number;
      item_name?: string | null;
      unit_price: number;
      reference_rate: number;
      effective_from?: string | null;
      effective_until?: string | null;
      applicability_notes: string;
    }>;
    not_checked_reason?: string | null;
  } | null;
  extraction_confirmed: boolean;
  extraction_method: string;
  status: string;
  created_at?: string | null;
}

export interface AuditDetailOut extends AuditOut {
  bill_items: BillItemOut[];
  findings: AuditFinding[];
}

export interface BenchmarkRateOut {
  id: string;
  service_name: string;
  category?: string | null;
  rate: number;
  source_name?: string | null;
  source_url?: string | null;
  location?: string | null;
  applicability_notes?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
  created_at?: string | null;
}

export interface DashboardStats {
  total_audits: number;
  total_findings: number;
  arithmetic_discrepancies: number;
  duplicate_entries: number;
  benchmark_discrepancies: number;
  recent_audits: AuditOut[];
}

export interface AuditResult {
  audit_id: string;
  summary: {
    confirmed_arithmetic_discrepancy: number;
    possible_duplicate_amount: number;
    potential_benchmark_difference: number;
    total_findings: number;
    items_requiring_manual_review: number;
  };
  arithmetic: any;
  duplicates: any;
  date_checks: any;
  unclear_charges: any;
  benchmark: any;
  findings: AuditFinding[];
  original_total?: number | null;
  calculated_total?: number | null;
  extraction_method: string;
}

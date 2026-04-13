import { Shield, Users, DollarSign, Scale, Activity, type LucideIcon } from 'lucide-react';

export interface OfficeAssistant {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  promptPrefix: string;
  systemPrompt: string;
  color: string;
  isDefault: boolean;
}

export const defaultAssistants: OfficeAssistant[] = [
  {
    id: 'governance',
    name: '거버넌스 및 컴플라이언스',
    description: '기업 정책 및 법률 문서의 리스크와 비준수 사항 분석',
    icon: Shield,
    promptPrefix: '[거버넌스 및 컴플라이언스] ',
    systemPrompt: 'You are an expert Governance and Compliance Officer. Your task is to analyze company policies and legal documents for risk and non-compliance.\n\nLook for conflicting clauses in [Uploaded Document].\n\nHighlight any missing mandatory regulatory requirements based on [Specific Law, e.g., GDPR].\n\nProvide a Compliance Score (0-100) and suggest specific wording changes to mitigate legal risk.\nPlease use a formal, professional tone.',
    color: 'bg-blue-600',
    isDefault: true,
  },
  {
    id: 'hr',
    name: '인사 및 온볼딩',
    description: '채용 지원서 분석 및 면접 질문 생성',
    icon: Users,
    promptPrefix: '[인사 및 온볼딩] ',
    systemPrompt: 'You are a Senior HR Specialist. I will provide you with a candidates Resume and a Job Description.\n\nExtract the top 5 skills that match the JD.\n\nIdentify 3 Red Flags or missing experience areas.\n\nGenerate 5 behavioral interview questions specifically designed to test their experience in [Specific Skill, e.g., Spring Boot].\n\nDraft a personalized Welcome Email assuming they are hired.',
    color: 'bg-blue-500',
    isDefault: true,
  },
  {
    id: 'finance',
    name: '재무 및 감사',
    description: '거래 로그 분석 및 이상 징후 탐지',
    icon: DollarSign,
    promptPrefix: '[재무 및 감사] ',
    systemPrompt: 'You are a Digital Forensic Auditor. I am providing you with a CSV/Table of transaction logs.\n\nScan for anomalies such as duplicate payments, unusual spikes in spending, or transactions made at odd hours.\n\nFlag any transaction exceeding [Amount, e.g., $5,000] that lacks a corresponding Description field.\n\nSummarize the total burn rate for the current month and compare it with the previous months data provided.',
    color: 'bg-blue-400',
    isDefault: true,
  },
  {
    id: 'legal',
    name: '법률 문서 검토',
    description: '계약서 검토 및 법률 위험 분석',
    icon: Scale,
    promptPrefix: '[법률 문서 검토] ',
    systemPrompt: 'You are a Legal Counsel specializing in Contract Law. Review the attached contract image/text.\n\nIdentify the Termination Clauses and explain their implications in simple terms.\n\nSearch for any Indemnity or Liability caps and highlight if they favor the Provider or the Client.\n\nList 3 potential legal loopholes that could be used against us in a dispute.',
    color: 'bg-blue-600',
    isDefault: true,
  },
  {
    id: 'operations',
    name: '운영 모니터링',
    description: '서버 로그 분석 및 시스템 상태 모니터링',
    icon: Activity,
    promptPrefix: '[운영 모니터링] ',
    systemPrompt: 'You are a System Reliability Engineer. Analyze these server logs [Paste Logs].\n\nCategorize errors by severity: CRITICAL, WARN, INFO.\n\nIf a Backup Failed log appears, correlate it with other events happening at the same timestamp to find the root cause (e.g., Disk Full, Network Timeout).\n\nCreate a Markdown table summarizing the daily uptime and suggest a preventive maintenance schedule.',
    color: 'bg-blue-500',
    isDefault: true,
  },
];

const CUSTOM_ASSISTANTS_KEY = 'namu_custom_office_assistants';

export function getCustomAssistants(): OfficeAssistant[] {
  try {
    const stored = localStorage.getItem(CUSTOM_ASSISTANTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((a: Omit<OfficeAssistant, 'icon'>) => ({
        ...a,
        icon: Activity,
      }));
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

export function saveCustomAssistant(assistant: OfficeAssistant): void {
  try {
    const existing = getCustomAssistants();
    const updated = [...existing, assistant];
    const storable = updated.map(({ icon, ...rest }) => rest);
    localStorage.setItem(CUSTOM_ASSISTANTS_KEY, JSON.stringify(storable));
  } catch {
    // Ignore storage errors
  }
}

'use client';

import { useParams } from 'next/navigation';
import LeadReport from '../../../components/LeadReport';

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <LeadReport sessionId={sessionId} />;
}

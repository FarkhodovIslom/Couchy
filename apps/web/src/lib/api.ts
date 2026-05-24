import {
  LearningStep,
  OnboardingStartResponse,
  ProactiveAlert,
  GraphNode,
  GraphEdge,
  UserRole,
  GenerateDocRequest,
  GeneratedDoc,
  CodeReviewRequest,
  CodeReviewReport,
  BugAnalyzeRequest,
  BugRiskReport,
  BugRecordRequest,
  SADraftRequest,
  SARefinedRequest,
  SADocument,
} from '@kibo/shared';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export async function startOnboarding(
  name: string,
  role: UserRole,
): Promise<OnboardingStartResponse> {
  const res = await fetch(`${API_URL}/onboarding/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role }),
  });
  if (!res.ok) throw new Error(`startOnboarding failed: ${res.status}`);
  return res.json();
}

export async function toggleStep(
  sessionId: string,
  stepId: string,
  completed: boolean,
): Promise<void> {
  await fetch(`${API_URL}/onboarding/${sessionId}/step/${stepId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
}

export async function getLearningPath(sessionId: string): Promise<LearningStep[]> {
  const res = await fetch(`${API_URL}/onboarding/${sessionId}/path`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.steps ?? [];
}

export async function getProgress(
  sessionId: string,
): Promise<{ total: number; completed: number; percent: number }> {
  const res = await fetch(`${API_URL}/onboarding/${sessionId}/progress`);
  if (!res.ok) return { total: 0, completed: 0, percent: 0 };
  return res.json();
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function getAlerts(sessionId: string): Promise<ProactiveAlert[]> {
  const res = await fetch(`${API_URL}/alerts/${sessionId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.alerts ?? [];
}

export async function markAlertRead(alertId: string): Promise<void> {
  await fetch(`${API_URL}/alerts/${alertId}/read`, { method: 'PATCH' });
}

export async function getAlertReport(sessionId: string): Promise<{
  totalAlerts: number;
  unreadAlerts: number;
  gapNodes: Array<{ nodeId: string; count: number }>;
  alertsByType: Record<string, number>;
}> {
  const res = await fetch(`${API_URL}/alerts/report/${sessionId}`);
  if (!res.ok) return { totalAlerts: 0, unreadAlerts: 0, gapNodes: [], alertsByType: {} };
  return res.json();
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export async function getGraphSnapshot(): Promise<{
  nodes: GraphNode[];
  edges: GraphEdge[];
}> {
  const res = await fetch(`${API_URL}/graph/snapshot`);
  if (!res.ok) return { nodes: [], edges: [] };
  return res.json();
}

export async function getGraphNode(
  nodeId: string,
): Promise<{ node: GraphNode; neighbors: unknown[] } | null> {
  const res = await fetch(`${API_URL}/graph/node/${encodeURIComponent(nodeId)}`);
  if (!res.ok) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Chat — SSE via fetch + ReadableStream (NOT EventSource — POST not supported)
// ---------------------------------------------------------------------------

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onThinking?: (text: string) => void;
  onSources: (nodes: GraphNode[]) => void;
  onAlerts: (alerts: ProactiveAlert[]) => void;
  onSuggestions?: (suggestions: string[]) => void;
  onStepComplete?: (stepId: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamMessage(
  sessionId: string,
  content: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const { onToken, onThinking, onSources, onAlerts, onSuggestions, onStepComplete, onDone, onError } = callbacks;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/chat/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
      signal,
    });
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!response.ok || !response.body) {
    onError(new Error(`Chat request failed: ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newlines (SSE event boundary) or single newlines
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const raw = trimmed.slice(6);
        if (raw === '[DONE]') {
          onDone();
          return;
        }

        let parsed: { type: string; content?: string; nodes?: GraphNode[]; alerts?: ProactiveAlert[]; suggestions?: string[]; stepId?: string };
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue; // Incomplete or malformed JSON — skip
        }

        switch (parsed.type) {
          case 'token':
            if (parsed.content) onToken(parsed.content);
            break;
          case 'thinking':
            if (parsed.content && onThinking) onThinking(parsed.content);
            break;
          case 'sources':
            if (parsed.nodes) onSources(parsed.nodes);
            break;
          case 'alerts':
            if (parsed.alerts) onAlerts(parsed.alerts);
            break;
          case 'step_complete':
            if (parsed.stepId && onStepComplete) onStepComplete(parsed.stepId);
            break;
          case 'suggestions':
            if (parsed.suggestions && onSuggestions) onSuggestions(parsed.suggestions);
            break;
          case 'done':
            onDone();
            return;
          case 'error':
            onError(new Error(parsed.content ?? 'Unknown stream error'));
            return;
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return; // Intentional stop
    onError(err instanceof Error ? err : new Error(String(err)));
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------

export async function generateDoc(request: GenerateDocRequest): Promise<GeneratedDoc> {
  const res = await fetch(`${API_URL}/docs/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`generateDoc failed: ${res.status}`);
  return res.json();
}

export async function getDoc(featureId: string): Promise<GeneratedDoc | null> {
  const res = await fetch(`${API_URL}/docs/${encodeURIComponent(featureId)}`);
  if (!res.ok) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export async function reviewCode(request: CodeReviewRequest): Promise<CodeReviewReport> {
  const res = await fetch(`${API_URL}/review/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`reviewCode failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Bugs
// ---------------------------------------------------------------------------

export async function analyzeBug(request: BugAnalyzeRequest): Promise<BugRiskReport> {
  const res = await fetch(`${API_URL}/bugs/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`analyzeBug failed: ${res.status}`);
  return res.json();
}

export async function recordBug(request: BugRecordRequest): Promise<void> {
  await fetch(`${API_URL}/bugs/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

// ---------------------------------------------------------------------------
// SA Writer
// ---------------------------------------------------------------------------

export async function draftSA(request: SADraftRequest): Promise<SADocument> {
  const res = await fetch(`${API_URL}/sa/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`draftSA failed: ${res.status}`);
  return res.json();
}

export async function refineSA(request: SARefinedRequest): Promise<SADocument> {
  const res = await fetch(`${API_URL}/sa/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`refineSA failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export async function startSimulation(sessionId: string): Promise<void> {
  const res = await fetch(`${API_URL}/simulation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`startSimulation failed: ${res.status}`);
}

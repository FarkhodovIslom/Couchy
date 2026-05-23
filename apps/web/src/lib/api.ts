import {
  LearningStep,
  OnboardingStartResponse,
  ProactiveAlert,
  GraphNode,
  GraphEdge,
  UserRole,
} from '@couchy/shared';

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

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function getAlerts(sessionId: string): Promise<ProactiveAlert[]> {
  const res = await fetch(`${API_URL}/alerts/${sessionId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.alerts ?? [];
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

// ---------------------------------------------------------------------------
// Chat — SSE via fetch + ReadableStream (NOT EventSource — POST not supported)
// ---------------------------------------------------------------------------

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onSources: (nodes: GraphNode[]) => void;
  onAlerts: (alerts: ProactiveAlert[]) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamMessage(
  sessionId: string,
  content: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const { onToken, onSources, onAlerts, onDone, onError } = callbacks;

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

        let parsed: { type: string; content?: string; nodes?: GraphNode[]; alerts?: ProactiveAlert[] };
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue; // Incomplete or malformed JSON — skip
        }

        switch (parsed.type) {
          case 'token':
            if (parsed.content) onToken(parsed.content);
            break;
          case 'sources':
            if (parsed.nodes) onSources(parsed.nodes);
            break;
          case 'alerts':
            if (parsed.alerts) onAlerts(parsed.alerts);
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

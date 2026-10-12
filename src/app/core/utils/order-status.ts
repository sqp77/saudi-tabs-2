/**
 * Maps backend order status codes to the 7-stage donation journey.
 *
 * CONFIRMED codes (appear in the Postman collection):
 *   - order.client.send       → stage 1, request submitted by the client
 *   - order.driver.completed  → stage 7, completed
 *
 * Every other code is inferred from the `order.<actor>.<action>` naming
 * convention and is flagged `inferred: true` so the UI can show the raw code
 * next to the friendly label. The backend team should supply the full enum
 * (see docs/BACKEND_REQUIREMENTS.md).
 */
export type Stage = 'submitted' | 'confirmed' | 'assigned' | 'onway' | 'arrived' | 'collected' | 'completed' | 'cancelled' | 'unknown';

export interface StageInfo {
  stage: Stage;
  /** 1..7 for the journey, 0 for cancelled/unknown. */
  step: number;
  inferred: boolean;
  active: boolean;
  terminal: boolean;
}

export const JOURNEY: Stage[] = ['submitted', 'confirmed', 'assigned', 'onway', 'arrived', 'collected', 'completed'];

const CONFIRMED: Record<string, Stage> = {
  'order.client.send': 'submitted',
  'order.driver.completed': 'completed',
};

const RULES: { test: RegExp; stage: Stage }[] = [
  { test: /cancel|reject|delet|decline|remov/i, stage: 'cancelled' },
  { test: /complet|finish|done|closed/i, stage: 'completed' },
  { test: /collect|picked|received|loaded/i, stage: 'collected' },
  { test: /arriv|reached|at[_.-]?location/i, stage: 'arrived' },
  { test: /on[_.-]?(the[_.-]?)?way|start|moving|en[_.-]?route|heading|depart/i, stage: 'onway' },
  { test: /assign|accept(ed)?$|driver\.(accept|new|pending)/i, stage: 'assigned' },
  { test: /confirm|approv|schedul|admin\.(accept|approve)|processing|review/i, stage: 'confirmed' },
  { test: /send|sent|new|created|pending|submit|client\./i, stage: 'submitted' },
];

export function stageOf(status: string | undefined | null): StageInfo {
  const code = (status ?? '').trim();
  let stage: Stage;
  let inferred = false;
  if (CONFIRMED[code]) stage = CONFIRMED[code];
  else {
    inferred = true;
    stage = 'unknown';
    for (const rule of RULES) {
      if (rule.test.test(code)) { stage = rule.stage; break; }
    }
    if (!code) stage = 'unknown';
  }
  const step = JOURNEY.indexOf(stage) + 1;
  const terminal = stage === 'completed' || stage === 'cancelled';
  return { stage, step, inferred, active: !terminal, terminal };
}

export const isActiveStatus = (status: string | undefined | null): boolean => stageOf(status).active;
export const isCompletedStatus = (status: string | undefined | null): boolean => stageOf(status).stage === 'completed';
export const isCancelledStatus = (status: string | undefined | null): boolean => stageOf(status).stage === 'cancelled';

/** Known status filter for GET /order/?status= */
export const STATUS_COMPLETED = 'order.driver.completed';
export const STATUS_SUBMITTED = 'order.client.send';

export function stageColor(stage: Stage): string {
  switch (stage) {
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    case 'arrived':
    case 'onway': return 'warning';
    case 'unknown': return 'medium';
    default: return 'primary';
  }
}

export function stageIcon(stage: Stage): string {
  switch (stage) {
    case 'submitted': return 'paper-plane-outline';
    case 'confirmed': return 'checkmark-circle-outline';
    case 'assigned': return 'person-outline';
    case 'onway': return 'car-outline';
    case 'arrived': return 'location-outline';
    case 'collected': return 'cube-outline';
    case 'completed': return 'ribbon-outline';
    case 'cancelled': return 'close-circle-outline';
    default: return 'time-outline';
  }
}

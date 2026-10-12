import { describe, expect, it } from 'vitest';
import { isActiveStatus, isCancelledStatus, isCompletedStatus, stageOf } from './order-status';

describe('order-status', () => {
  it('maps the confirmed collection statuses without inference', () => {
    expect(stageOf('order.client.send')).toMatchObject({ stage: 'submitted', step: 1, inferred: false, active: true });
    expect(stageOf('order.driver.completed')).toMatchObject({ stage: 'completed', step: 7, inferred: false, terminal: true });
  });

  it('infers stages from the naming convention and flags them', () => {
    expect(stageOf('order.admin.confirmed')).toMatchObject({ stage: 'confirmed', inferred: true });
    expect(stageOf('order.driver.assigned')).toMatchObject({ stage: 'assigned', inferred: true });
    expect(stageOf('order.driver.on_the_way')).toMatchObject({ stage: 'onway', inferred: true });
    expect(stageOf('order.driver.arrived')).toMatchObject({ stage: 'arrived', inferred: true });
    expect(stageOf('order.driver.collected')).toMatchObject({ stage: 'collected', inferred: true });
    expect(stageOf('order.client.cancelled')).toMatchObject({ stage: 'cancelled', terminal: true });
    expect(stageOf('order.admin.rejected')).toMatchObject({ stage: 'cancelled' });
  });

  it('treats unknown / empty statuses as unknown but active', () => {
    expect(stageOf('')).toMatchObject({ stage: 'unknown', active: true });
    expect(stageOf('something.weird')).toMatchObject({ stage: 'unknown', inferred: true });
  });

  it('exposes convenience predicates', () => {
    expect(isActiveStatus('order.client.send')).toBe(true);
    expect(isCompletedStatus('order.driver.completed')).toBe(true);
    expect(isCancelledStatus('order.client.cancel')).toBe(true);
    expect(isActiveStatus('order.driver.completed')).toBe(false);
  });
});

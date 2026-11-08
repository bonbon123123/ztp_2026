import { NotificationStatus } from "../Model/notification";

// PENDING -> SENT | FAILED | CANCELLED; pozostałe stany są końcowe
export const ALLOWED_TRANSITIONS: Record<NotificationStatus, Set<NotificationStatus>> = {
  [NotificationStatus.PENDING]: new Set([
    NotificationStatus.SENT,
    NotificationStatus.FAILED,
    NotificationStatus.CANCELLED,
  ]),
  [NotificationStatus.SENT]: new Set(),
  [NotificationStatus.FAILED]: new Set(),
  [NotificationStatus.CANCELLED]: new Set(),
};

/** Czy przejście current -> next jest dozwolone przez maszynę stanów. */
export function canTransition(current: NotificationStatus, next: NotificationStatus): boolean {
  return ALLOWED_TRANSITIONS[current]?.has(next) ?? false;
}

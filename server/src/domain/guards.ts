// State machine transition guards — enforce on server side regardless of UI state
import { DeliveryStatus, CreditStatus, CountStatus, PaymentStatus } from './statuses';

export class InvalidStateTransitionError extends Error {
  code = 'INVALID_STATE_TRANSITION';
  httpStatus = 409;
  constructor(current: string, attempted: string, entityType?: string) {
    super(
      `לא ניתן לבצע מעבר מסטטוס "${current}" לסטטוס "${attempted}"${entityType ? ` עבור ${entityType}` : ''}`
    );
  }
}

export class VersionConflictError extends Error {
  code = 'VERSION_CONFLICT';
  httpStatus = 409;
  constructor() {
    super('הנתון השתנה מאז הטעינה. אנא רענן ונסה שוב.');
  }
}

// Delivery guards
export function guardDeliverySubmit(status: string): void {
  if (status !== DeliveryStatus.DRAFT) {
    throw new InvalidStateTransitionError(status, DeliveryStatus.SUPPLIER_REPORTED, 'אספקה');
  }
}

export function guardDeliveryDispatchTrustee(status: string): void {
  if (status !== DeliveryStatus.SUPPLIER_REPORTED) {
    throw new InvalidStateTransitionError(status, DeliveryStatus.TRUSTEE_PENDING, 'אספקה');
  }
}

export function guardDeliveryClaimTrustee(status: string): void {
  if (status !== DeliveryStatus.TRUSTEE_PENDING) {
    throw new InvalidStateTransitionError(status, DeliveryStatus.TRUSTEE_IN_PROGRESS, 'אספקה');
  }
}

export function guardDeliveryCompleteTrusteeReceiving(status: string): void {
  if (status !== DeliveryStatus.TRUSTEE_IN_PROGRESS) {
    throw new InvalidStateTransitionError(status, DeliveryStatus.TRUSTEE_RECEIVED, 'אספקה');
  }
}

export function guardDeliveryApproveToInventory(status: string): void {
  if (status !== DeliveryStatus.ADMIN_REVIEW) {
    throw new InvalidStateTransitionError(status, DeliveryStatus.APPROVED_TO_INVENTORY, 'אספקה');
  }
}

export function guardDeliveryClose(status: string): void {
  if (status !== DeliveryStatus.APPROVED_TO_INVENTORY) {
    throw new InvalidStateTransitionError(status, DeliveryStatus.CLOSED, 'אספקה');
  }
}

export function guardDeliveryCancel(status: string): void {
  const cancellable: string[] = [
    DeliveryStatus.DRAFT,
    DeliveryStatus.SUPPLIER_REPORTED,
    DeliveryStatus.TRUSTEE_PENDING,
    DeliveryStatus.ADMIN_REVIEW,
  ];
  if (!cancellable.includes(status)) {
    throw new InvalidStateTransitionError(status, DeliveryStatus.CANCELLED, 'אספקה');
  }
}

// Credit guards
export function guardCreditSend(status: string): void {
  if (status !== CreditStatus.DRAFT) {
    throw new InvalidStateTransitionError(status, CreditStatus.SENT_TO_SUPPLIER, 'בקשת זיכוי');
  }
}

export function guardCreditUploadDocument(status: string): void {
  const allowed: string[] = [
    CreditStatus.WAITING_FOR_CREDIT_INVOICE,
    CreditStatus.REJECTED_DOCUMENT,
    CreditStatus.PARTIALLY_APPROVED,
  ];
  if (!allowed.includes(status)) {
    throw new InvalidStateTransitionError(status, CreditStatus.CREDIT_UPLOADED, 'בקשת זיכוי');
  }
}

export function guardCreditApproveDocument(status: string): void {
  if (status !== CreditStatus.WAITING_ADMIN_APPROVAL) {
    throw new InvalidStateTransitionError(status, CreditStatus.APPROVED, 'מסמך זיכוי');
  }
}

export function guardCreditClose(status: string): void {
  if (status !== CreditStatus.APPROVED) {
    throw new InvalidStateTransitionError(status, CreditStatus.CLOSED, 'בקשת זיכוי');
  }
}

// Inventory count guards
export function guardCountBegin(status: string): void {
  if (status !== CountStatus.READY_TO_COUNT) {
    throw new InvalidStateTransitionError(status, CountStatus.IN_PROGRESS, 'ספירת מלאי');
  }
}

export function guardCountComplete(status: string): void {
  if (status !== CountStatus.IN_PROGRESS) {
    throw new InvalidStateTransitionError(status, CountStatus.COMPLETED, 'ספירת מלאי');
  }
}

// Payment guards
export function guardPaymentPost(status: string): void {
  if (status !== PaymentStatus.READY_TO_POST) {
    throw new InvalidStateTransitionError(status, PaymentStatus.POSTED, 'תשלום');
  }
}

export function guardPaymentCancel(status: string): void {
  const cancellable: string[] = [
    PaymentStatus.DRAFT,
    PaymentStatus.AWAITING_DOCUMENT,
    PaymentStatus.UNDER_REVIEW,
  ];
  if (!cancellable.includes(status)) {
    throw new InvalidStateTransitionError(status, PaymentStatus.CANCELLED, 'תשלום');
  }
}

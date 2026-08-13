import { PrismaClient, Prisma, TimelineEventType } from '@prisma/client';

export interface CreateTimelineEventInput {
  userId: string;
  companyId: string;
  eventType: TimelineEventType;
  title: string;
  description?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  changedByUserId?: string | null;
  changedByName?: string | null;
  effectiveDate?: Date;
}

export class TimelineRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Transactional timeline event creation inside an existing Prisma transaction client
   */
  public async createTimelineEventInTx(
    tx: Prisma.TransactionClient,
    input: CreateTimelineEventInput
  ) {
    return tx.userTimelineEvent.create({
      data: {
        userId: input.userId,
        companyId: input.companyId,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        previousValue: input.previousValue,
        newValue: input.newValue,
        changedByUserId: input.changedByUserId,
        changedByName: input.changedByName,
        effectiveDate: input.effectiveDate ?? new Date(),
      },
    });
  }

  /**
   * Standalone creation (e.g. for seed operations)
   */
  public async createTimelineEvent(input: CreateTimelineEventInput) {
    return this.prisma.userTimelineEvent.create({
      data: {
        userId: input.userId,
        companyId: input.companyId,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        previousValue: input.previousValue,
        newValue: input.newValue,
        changedByUserId: input.changedByUserId,
        changedByName: input.changedByName,
        effectiveDate: input.effectiveDate ?? new Date(),
      },
    });
  }

  /**
   * Check if ONBOARDING event exists (used for seed idempotency)
   */
  public async hasOnboardingEvent(userId: string): Promise<boolean> {
    const event = await this.prisma.userTimelineEvent.findFirst({
      where: {
        userId,
        eventType: TimelineEventType.ONBOARDING,
      },
    });
    return !!event;
  }

  /**
   * Fetch timeline events for a user ordered newest to oldest
   */
  public async findUserTimeline(userId: string) {
    return this.prisma.userTimelineEvent.findMany({
      where: { userId },
      orderBy: { effectiveDate: 'desc' },
    });
  }
}

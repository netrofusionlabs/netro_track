import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { Card } from './Card';
import { TimelineEventType, TIMELINE_EVENT_LABELS } from '@netrotrack/shared';

export interface TimelineEventItem {
  id: string;
  userId: string;
  companyId: string;
  eventType: string;
  title: string;
  description?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  changedByUserId?: string | null;
  changedByName?: string | null;
  effectiveDate: string | Date;
  createdAt: string | Date;
}

export interface ProfessionalTimelineProps {
  events: TimelineEventItem[];
  emptyMessage?: string;
}

const getEventIcon = (eventType: string): string => {
  switch (eventType) {
    case TimelineEventType.ONBOARDING:
      return '🎉';
    case TimelineEventType.PROMOTION:
      return '🚀';
    case TimelineEventType.DESIGNATION_ASSIGNED:
    case TimelineEventType.DESIGNATION_CHANGED:
      return '💼';
    case TimelineEventType.ACCESS_ROLE_ASSIGNED:
    case TimelineEventType.ACCESS_ROLE_CHANGED:
      return '🛡️';
    case TimelineEventType.MANAGER_ASSIGNED:
    case TimelineEventType.MANAGER_CHANGED:
      return '👔';
    case TimelineEventType.LOCATION_CHANGED:
      return '📍';
    case TimelineEventType.DEPARTMENT_CHANGED:
      return '🏢';
    case TimelineEventType.EMPLOYMENT_TYPE_CHANGED:
      return '📜';
    default:
      return '📋';
  }
};

const formatDate = (dateInput: string | Date): string => {
  try {
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
};

export function ProfessionalTimeline({ events, emptyMessage }: ProfessionalTimelineProps) {
  const theme = useTheme();

  if (!events || events.length === 0) {
    return (
      <Card variant="outlined" style={styles.emptyCard}>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, textAlign: 'center' }]}>
          {emptyMessage || 'No employment history recorded yet.'}
        </Text>
      </Card>
    );
  }

  return (
    <Card variant="outlined" style={[styles.unifiedCard, { backgroundColor: theme.colors.surface.card }] as any}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const icon = getEventIcon(event.eventType);
        const eventLabel =
          TIMELINE_EVENT_LABELS[event.eventType as TimelineEventType] || event.title || 'Event';
        const isPromotion = event.eventType === TimelineEventType.PROMOTION;

        const hasPrevious = Boolean(
          event.previousValue &&
          event.previousValue.trim() !== '' &&
          event.previousValue !== 'None' &&
          event.previousValue !== 'null'
        );

        return (
          <View key={event.id || index} style={styles.stepRow}>
            {/* Left Node & Connector Line */}
            <View style={styles.nodeColumn}>
              <View
                style={[
                  styles.nodeBadge,
                  {
                    backgroundColor: isPromotion
                      ? theme.colors.brand.primary + '18'
                      : theme.colors.surface.background,
                    borderColor: isPromotion
                      ? theme.colors.brand.primary
                      : theme.colors.surface.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 11 }}>{icon}</Text>
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.connectorLine,
                    { backgroundColor: theme.colors.surface.border },
                  ]}
                />
              )}
            </View>

            {/* Right Content */}
            <View style={[styles.contentColumn, !isLast && { paddingBottom: 14 }]}>
              <View style={styles.topHeader}>
                <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '700', flex: 1 }]}>
                  {eventLabel}
                </Text>
                <View style={[styles.dateBadge, { backgroundColor: theme.colors.surface.background }]}>
                  <Text style={[typography.caption, { color: theme.colors.text.tertiary, fontSize: 11 }]}>
                    {formatDate(event.effectiveDate)}
                  </Text>
                </View>
              </View>

              {/* Value Snippet */}
              {(event.previousValue || event.newValue) && (
                <View style={styles.valueRow}>
                  {hasPrevious && (
                    <>
                      <Text style={[typography.caption, { color: theme.colors.text.secondary, fontWeight: '500' }]}>
                        {event.previousValue}
                      </Text>
                      <Text style={[typography.caption, { color: theme.colors.brand.primary, marginHorizontal: 5, fontWeight: '700' }]}>
                        →
                      </Text>
                    </>
                  )}
                  {event.newValue ? (
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: isPromotion
                            ? theme.colors.brand.primary
                            : theme.colors.text.primary,
                          fontWeight: '700',
                          backgroundColor: isPromotion
                            ? theme.colors.brand.primary + '15'
                            : theme.colors.surface.background,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          overflow: 'hidden',
                        },
                      ]}
                    >
                      {event.newValue}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Editor Subtitle */}
              {!!event.changedByName && (
                <Text style={[typography.caption, { color: theme.colors.text.tertiary, fontSize: 11, marginTop: 3 }]}>
                  Recorded by <Text style={{ color: theme.colors.text.secondary, fontWeight: '600' }}>{event.changedByName}</Text>
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  unifiedCard: {
    padding: 14,
    borderRadius: 12,
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
  stepRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    width: 26,
    alignItems: 'center',
  },
  nodeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  contentColumn: {
    flex: 1,
    marginLeft: 10,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
});

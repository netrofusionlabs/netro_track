import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { AppIcon } from '../../../shared/components/AppIcon';
import { Avatar, Badge, Card, ScreenHeader, Button } from '../../../shared/components';
import { useOrgChartRoots, useOrgChartSubordinates, useOrgChartSearch } from '../hooks/useUserManagement';
import { userManagementService } from '../services/userManagementService';
import { ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';
import { useQueryClient } from '@tanstack/react-query';

interface OrgUser {
  id: string;
  employeeId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  roleLabel: string;
  status: string;
  designationName: string | null;
  departmentName: string | null;
  managerId: string | null;
  managerName: string | null;
  subordinatesCount?: number;
}

interface TreeNodeProps {
  node: OrgUser;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onSelectUser: (user: OrgUser) => void;
  level: number;
  isLastChild?: boolean;
}

function TreeNode({ node, expandedIds, toggleExpand, onSelectUser, level, isLastChild }: TreeNodeProps) {
  const theme = useTheme();
  const isExpanded = expandedIds.has(node.id);
  const taggedCount = node.subordinatesCount ?? 0;
  const hasChildren = taggedCount > 0;

  // On-demand lazy fetch of direct subordinates from server when node is expanded!
  const { data: children = [], isLoading: isChildrenLoading } = useOrgChartSubordinates(
    isExpanded ? node.id : ''
  );

  return (
    <View style={styles.treeNodeWrapper}>
      {/* Visual Horizontal Branch Connector Line for Subordinates (Levels > 0) */}
      {level > 0 && (
        <View
          style={[
            styles.horizontalBranchLine,
            { borderColor: theme.colors.surface.border },
          ]}
        />
      )}

      {/* Pill Card Split Design (Matching User UI Screenshot) */}
      <View
        style={[
          styles.nodeCardSplit,
          {
            backgroundColor: theme.colors.surface.card,
            borderColor: isExpanded ? theme.colors.brand.primary : theme.colors.surface.border,
          },
        ]}
      >
        {/* Left Section: Avatar, Name & Designation (Click to open Popover Modal) */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onSelectUser(node)}
          style={styles.nodeLeftMain}
        >
          <Avatar name={node.name} size="sm" />
          <View style={styles.nodeInfoBlock}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {node.name}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]} numberOfLines={1}>
              {node.designationName || 'Team Member'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right Section: Split Counter Badge Box (Click to Expand / Derive Subordinates) */}
        {hasChildren ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => toggleExpand(node.id)}
            style={[
              styles.nodeRightCounter,
              {
                backgroundColor: isExpanded ? theme.colors.brand.primary : '#E2E8F0',
                borderLeftColor: theme.colors.surface.border,
              },
            ]}
          >
            {isChildrenLoading ? (
              <ActivityIndicator size="small" color={isExpanded ? '#FFFFFF' : '#475569'} />
            ) : (
              <>
                <AppIcon
                  name="employees"
                  color={isExpanded ? '#FFFFFF' : '#475569'}
                  size={15}
                />
                <Text
                  style={[
                    typography.bodySm,
                    {
                      color: isExpanded ? '#FFFFFF' : '#334155',
                      fontWeight: '700',
                      marginLeft: 5,
                    },
                  ]}
                >
                  {taggedCount}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.nodeRightCounterEmpty, { borderLeftColor: theme.colors.surface.border }]}>
            <Text style={[typography.caption, { color: theme.colors.text.tertiary, fontSize: 11 }]}>
              Single
            </Text>
          </View>
        )}
      </View>

      {/* Nested Children Subordinate Tree Stem */}
      {hasChildren && isExpanded && (
        <View style={styles.childrenContainer}>
          {/* Vertical Hierarchy Line Connecting Children */}
          <View style={[styles.verticalTreeLine, { borderColor: theme.colors.surface.border }]} />

          <View style={styles.childrenList}>
            {isChildrenLoading && children.length === 0 ? (
              <View style={styles.loadingBranchBox}>
                <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 8 }]}>
                  Deriving subordinates...
                </Text>
              </View>
            ) : (
              children.map((child, idx) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  onSelectUser={onSelectUser}
                  level={level + 1}
                  isLastChild={idx === children.length - 1}
                />
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );
}

/** Detail Popover Modal / Tooltip Sheet */
function UserPopoverModal({
  user,
  visible,
  onClose,
}: {
  user: OrgUser | null;
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: theme.colors.surface.card }]} onPress={() => {}}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Avatar name={user.name} size="md" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>{user.name}</Text>
                <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                  💼 {user.designationName || 'Team Member'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <AppIcon name="close" color={theme.colors.text.secondary} size={20} />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalDivider, { backgroundColor: theme.colors.surface.divider }]} />

          {/* Details Table */}
          <View style={styles.modalDetailsList}>
            <View style={styles.modalDetailRow}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, width: 110 }]}>Role Level:</Text>
              <Badge label={ROLE_DISPLAY_LABELS[user.role as UserRole] || user.role} variant="info" size="sm" />
            </View>

            <View style={styles.modalDetailRow}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, width: 110 }]}>Employee ID:</Text>
              <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>{user.employeeId}</Text>
            </View>

            {!!user.email && (
              <View style={styles.modalDetailRow}>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, width: 110 }]}>Email:</Text>
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1 }]} numberOfLines={1}>{user.email}</Text>
              </View>
            )}

            {!!user.phone && (
              <View style={styles.modalDetailRow}>
                <Text style={[typography.caption, { color: theme.colors.text.secondary, width: 110 }]}>Phone:</Text>
                <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>{user.phone}</Text>
              </View>
            )}

            <View style={styles.modalDetailRow}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, width: 110 }]}>Reporting To:</Text>
              <Text style={[typography.bodySm, { color: user.managerName ? theme.colors.brand.primary : theme.colors.text.tertiary, fontWeight: '700' }]}>
                {user.managerName || 'Top Leadership'}
              </Text>
            </View>

            <View style={styles.modalDetailRow}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, width: 110 }]}>Tagged Subordinates:</Text>
              <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                👥 {user.subordinatesCount ?? 0} Direct Reports
              </Text>
            </View>
          </View>

          <Button label="Close" onPress={onClose} variant="outline" size="md" fullWidth style={{ marginTop: 16 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function OrgChartScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  // Fetch initial Root Leadership from server (Redis cached 1-hr TTL)
  const { data: roots = [], isLoading, refetch } = useOrgChartRoots();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Server-side tenant org chart search (Redis cached 1-hr TTL)
  const { data: searchResults = [], isLoading: isSearching } = useOrgChartSearch(searchQuery);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Hard reload / force refresh from PostgreSQL Neon DB & update Redis Cloud
  const handleHardReload = async () => {
    setRefreshing(true);
    try {
      await userManagementService.getOrgChartRoots(true); // ?refresh=true
      // Tell React Query to drop its local mobile cache for ALL org chart queries!
      await queryClient.invalidateQueries({ queryKey: ['org-chart-roots'] });
      await queryClient.invalidateQueries({ queryKey: ['org-chart-subordinates'] });
      await queryClient.invalidateQueries({ queryKey: ['org-chart-search'] });
      await refetch();
    } catch (e) {
      console.error('Hard reload failed:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const isSearchActive = searchQuery.trim().length >= 2;

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScreenHeader
        title="Organization Chart"
        subtitle="Visual company hierarchy & reporting tree"
      />

      <View style={styles.container}>
        {/* Search & Action Controls */}
        <View style={styles.controlsRow}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border },
            ]}
          >
            <AppIcon name="search" color={theme.colors.text.secondary} size={18} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text.primary }]}
              placeholder="Server search across company members..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <AppIcon name="close" color={theme.colors.text.secondary} size={18} />
              </TouchableOpacity>
            )}
          </View>

          {!isSearchActive && (
            <View style={styles.toggleButtonsRow}>
              {/* Hard Reload Sync Button */}
              <TouchableOpacity
                onPress={handleHardReload}
                disabled={refreshing}
                style={[styles.toggleBtn, { backgroundColor: theme.colors.brand.primaryLight }]}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                ) : (
                  <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                    🔄 Hard Reload
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={collapseAll}
                style={[styles.toggleBtn, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border, borderWidth: 1 }]}
              >
                <Text style={[typography.caption, { color: theme.colors.text.secondary, fontWeight: '600' }]}>
                  Collapse All
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tree / Server Search Content Area with Pull-To-Refresh */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleHardReload}
              colors={[theme.colors.brand.primary]}
              tintColor={theme.colors.brand.primary}
            />
          }
        >
          {isSearchActive ? (
            isSearching ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 8 }]}>
                  Searching Redis & Server database...
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <Card style={{ padding: 20, alignItems: 'center' }}>
                <AppIcon name="employees" color={theme.colors.text.tertiary} size={32} />
                <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 8 }]}>
                  No company members match "{searchQuery}"
                </Text>
              </Card>
            ) : (
              searchResults.map((user: OrgUser) => (
                <TouchableOpacity
                  key={user.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedUser(user)}
                  style={[
                    styles.nodeCardSplit,
                    {
                      backgroundColor: theme.colors.surface.card,
                      borderColor: theme.colors.surface.border,
                      marginBottom: 10,
                    },
                  ]}
                >
                  <View style={styles.nodeLeftMain}>
                    <Avatar name={user.name} size="sm" />
                    <View style={styles.nodeInfoBlock}>
                      <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>{user.name}</Text>
                      <Text style={[typography.caption, { color: theme.colors.brand.primary, marginTop: 1 }]}>
                        💼 {user.designationName || 'Team Member'} · Reports to: {user.managerName || 'Leadership'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.nodeRightCounterEmpty, { borderLeftColor: theme.colors.surface.border }]}>
                    <AppIcon name="chevronRight" color={theme.colors.text.tertiary} size={16} />
                  </View>
                </TouchableOpacity>
              ))
            )
          ) : isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.colors.brand.primary} />
              <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 12 }]}>
                Deriving root organization leaders from Redis...
              </Text>
            </View>
          ) : roots.length === 0 ? (
            <Card style={{ padding: 24, alignItems: 'center' }}>
              <AppIcon name="employees" color={theme.colors.text.secondary} size={36} />
              <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginTop: 12 }]}>
                No Organization Root Found
              </Text>
            </Card>
          ) : (
            roots.map((rootNode) => (
              <TreeNode
                key={rootNode.id}
                node={rootNode}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
                onSelectUser={(u) => setSelectedUser(u)}
                level={0}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Popover Detail Modal Sheet */}
      <UserPopoverModal
        user={selectedUser}
        visible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  controlsRow: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    padding: 0,
  },
  toggleButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  treeNodeWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  horizontalBranchLine: {
    position: 'absolute',
    left: -18,
    top: 20,
    width: 18,
    height: 1,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
  },
  nodeCardSplit: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  nodeLeftMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  nodeInfoBlock: {
    flex: 1,
    marginLeft: 10,
  },
  nodeRightCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    minWidth: 54,
  },
  nodeRightCounterEmpty: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
  },
  childrenContainer: {
    position: 'relative',
    marginLeft: 24,
    marginTop: 8,
    paddingLeft: 12,
  },
  verticalTreeLine: {
    position: 'absolute',
    left: -12,
    top: -4,
    bottom: 20,
    width: 1,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
  },
  childrenList: {},
  loadingBranchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    marginVertical: 14,
  },
  modalDetailsList: {
    gap: 10,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

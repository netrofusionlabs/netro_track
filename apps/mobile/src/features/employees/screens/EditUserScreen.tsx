import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import {
  ScreenHeader,
  Card,
  Button,
  SearchInput,
  PhoneInput,
  LoadingState,
  AppIcon,
} from '../../../shared/components';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { useSupervisors, useUpdateUser } from '../hooks/useUserManagement';
import { useAttendancePolicies } from '../../attendance/hooks/useAttendance';
import { useCompanies } from '../../companies/hooks/useCompanies';
import {
  ROLE_DISPLAY_LABELS,
  ROLE_HIERARCHY,
  UserRole,
  getCreatableRoles,
} from '@netrotrack/shared';


const ROLES_WITH_SUPERVISOR: string[] = ['EMPLOYEE', 'MANAGER', 'HR'];

export function EditUserScreen({ route, navigation }: any) {
  const theme = useTheme();
  const permissions = usePermissions();
  const { user } = route.params;
  const updateMutation = useUpdateUser();

  // ── Basic & Communication fields ─────────────────────────────────────────────
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? '');
  const [personalEmail, setPersonalEmail] = useState(user.personalEmail ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [secondaryPhone, setSecondaryPhone] = useState(user.secondaryPhone ?? '');
  const [emergencyContactName, setEmergencyContactName] = useState(user.emergencyContactName ?? '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user.emergencyContactPhone ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl ?? '');
  const [twitterUrl, setTwitterUrl] = useState(user.twitterUrl ?? '');
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup ?? '');
  const [designationName, setDesignationName] = useState(user.designation?.name ?? '');

  // ── Role change ───────────────────────────────────────────────────────────────
  const currentUserRank = ROLE_HIERARCHY[permissions.userRole] ?? 0;
  const targetCurrentRank = ROLE_HIERARCHY[user.role as UserRole] ?? 0;

  // Actor can change role if they can edit this user AND current role is below actor rank
  const canChangeRole = permissions.canEditUser(user.role, user.id) &&
    currentUserRank > targetCurrentRank;

  const userCompanyCode = (user as any).company?.code || ((user as any).companyName?.toLowerCase().includes('netro') ? 'NETRO' : '');
  const isPlatformUserCompany = userCompanyCode === 'NETRO' || ((user as any).companyName?.toLowerCase().includes('netro') ?? false);

  // Roles the actor is allowed to assign — filtered to ranks < actor rank
  // (Super Admin & Master Super Admin are only allowed for platform company)
  const assignableRoles = canChangeRole
    ? getCreatableRoles(permissions.userRole).filter(
        (r) => {
          if ((ROLE_HIERARCHY[r] ?? 0) === targetCurrentRank) return false;
          if (!isPlatformUserCompany && (r === UserRole.SUPER_ADMIN || r === UserRole.MASTER_SUPER_ADMIN)) return false;
          return true;
        }
      )
    : [];

  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role as UserRole);
  const [roleTouched, setRoleTouched] = useState(false);
  const [selectedAttendancePolicyId, setSelectedAttendancePolicyId] = useState<string | null>(
    user.attendancePolicyId ?? null
  );
  const [policyTouched, setPolicyTouched] = useState(false);
  const { data: policies = [], isLoading: loadingPolicies } = useAttendancePolicies(undefined, 'ATTENDANCE');

  const { data: companies = [] } = useCompanies();
  const userCompany = companies.find((c) => c.id === user.companyId);
  const isCompanyGpsDisabled = userCompany
    ? !userCompany.modules?.some((m: any) => m.module === 'GPS' && m.isEnabled)
    : false;

  const [isGpsTracked, setIsGpsTracked] = useState(user.isGpsTracked ?? true);
  const [gpsTouched, setGpsTouched] = useState(false);

  // Auto-enable GPS tracking when admin switches to a policy with GPS REQUIRED/OPTIONAL
  React.useEffect(() => {
    if (!policyTouched || !selectedAttendancePolicyId) return;
    const selectedPolicy = policies.find((p) => p.id === selectedAttendancePolicyId);
    if (!selectedPolicy) return;
    const punchInGps: string | undefined = selectedPolicy.punchInConfig?.gps;
    if (punchInGps === 'REQUIRED' || punchInGps === 'OPTIONAL') {
      setIsGpsTracked(true);
    }
  }, [selectedAttendancePolicyId, policyTouched, policies]);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setRoleTouched(true);
    // Reset supervisor when role changes — different roles need different supervisors
    setSupervisorTouched(false);
    setSelectedSupervisorId(null);
    setSupervisorSearch('');
  };

  // ── Supervisor (Reporting To) ─────────────────────────────────────────────────
  // Use the *effective* role (changed or original) to fetch valid supervisors.
  // Normalize legacy DB value FIELD_EMPLOYEE → EMPLOYEE for the includes check.
  const effectiveRole = roleTouched ? selectedRole : (user.role as UserRole);
  const normalizedEffectiveRole =
    (effectiveRole as string) === 'FIELD_EMPLOYEE' ? 'EMPLOYEE' : (effectiveRole as string);
  const needsSupervisor = ROLES_WITH_SUPERVISOR.includes(normalizedEffectiveRole);

  const canEditSupervisor =
    needsSupervisor &&
    (permissions.isCompanyAdmin || permissions.isHr || permissions.isSuperAdmin);

  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(
    user.managerId ?? null
  );
  const [supervisorTouched, setSupervisorTouched] = useState(false);
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search — 350ms
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSupervisorSearch = useCallback((text: string) => {
    setSupervisorSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(text.trim()), 350);
  }, []);

  const { data: supervisors = [], isLoading: loadingSupervisors, isFetching } = useSupervisors(
    canEditSupervisor ? normalizedEffectiveRole : '',
    debouncedSearch || undefined,
    undefined,
    user.id, // never show the user as their own supervisor
  );

  const handleSelectSupervisor = (id: string | null) => {
    setSelectedSupervisorId(id);
    setSupervisorTouched(true);
  };

  const [isPromotion, setIsPromotion] = useState(false);

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }
    if (!designationName.trim()) {
      Alert.alert('Validation Error', 'Designation / Job Title is required');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Official Work Email is required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Primary Mobile Number is required');
      return;
    }
    if (!emergencyContactName.trim()) {
      Alert.alert('Validation Error', 'Emergency Contact Person Name is required');
      return;
    }
    if (!emergencyContactPhone.trim()) {
      Alert.alert('Validation Error', 'Emergency Contact Phone Number is required');
      return;
    }

    const payload: Record<string, any> = {
      name: name.trim(),
      email: email.trim(),
      personalEmail: personalEmail.trim() || null,
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim() || null,
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      linkedinUrl: linkedinUrl.trim() || null,
      twitterUrl: twitterUrl.trim() || null,
      bloodGroup: bloodGroup.trim() || null,
      designationName: designationName.trim(),
      isPromotion: designationName.trim() !== (user.designation?.name || '') ? isPromotion : undefined,
    };

    if (roleTouched) {
      payload.role = selectedRole;
    }

    if (supervisorTouched) {
      payload.managerId = selectedSupervisorId;
    }

    if (policyTouched) {
      payload.attendancePolicyId = selectedAttendancePolicyId;
    }

    if (gpsTouched) {
      payload.isGpsTracked = isGpsTracked;
    }

    try {
      await updateMutation.mutateAsync({ id: user.id, payload });
      Alert.alert('Success', `${name} updated successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update user.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Edit User"
          subtitle={`${user.name} · ${ROLE_DISPLAY_LABELS[user.role as UserRole] || user.role}`}
        />

        <Card variant="elevated" style={styles.formCard}>

          {/* ── Basic fields ── */}
          <Text style={[typography.label, { color: theme.colors.text.primary }]}>Full Name *</Text>
          <SearchInput value={name} onChangeText={setName} placeholder="Full name" />

          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Official Work Email *
          </Text>
          <SearchInput value={email} onChangeText={setEmail} placeholder="email@company.com" />

          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Personal Email (Optional)
          </Text>
          <SearchInput value={personalEmail} onChangeText={setPersonalEmail} placeholder="personal@gmail.com" />

          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Primary Mobile Number *
          </Text>
          <PhoneInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter 10-digit primary mobile"
          />

          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Secondary / Alternate Phone (Optional)
          </Text>
          <PhoneInput
            value={secondaryPhone}
            onChangeText={setSecondaryPhone}
            placeholder="Enter alternate mobile number"
          />

          {/* Blood Group (Optional) */}
          <View style={{ marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: theme.colors.surface.card, borderWidth: 1, borderColor: theme.colors.surface.border }}>
            <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700', marginBottom: 6 }]}>
              🩸 Blood Group (Optional)
            </Text>
            <SearchInput
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder="e.g. A+, O+, B-, AB+..."
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: bloodGroup === bg ? theme.colors.brand.primary : theme.colors.surface.border,
                      backgroundColor: bloodGroup === bg ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                      marginRight: 6,
                    },
                  ]}
                  onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                >
                  <Text style={[typography.caption, { color: theme.colors.text.primary, fontWeight: bloodGroup === bg ? '700' : '500' }]}>
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Emergency Contact */}
          <View style={{ marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: theme.colors.surface.card, borderWidth: 1, borderColor: theme.colors.surface.border }}>
            <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700', marginBottom: 8 }]}>
              🆘 Emergency Contact Information *
            </Text>
            <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
              Emergency Contact Person Name *
            </Text>
            <SearchInput
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="e.g. Spouse / Parent / Relative Name"
            />
            <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 10, marginBottom: 4 }]}>
              Emergency Contact Phone Number *
            </Text>
            <PhoneInput
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder="Enter emergency contact mobile"
            />
          </View>

          {/* Social Media Links */}
          <View style={{ marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: theme.colors.surface.card, borderWidth: 1, borderColor: theme.colors.surface.border }}>
            <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700', marginBottom: 8 }]}>
              🔗 Professional & Social Links (Optional)
            </Text>
            <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
              LinkedIn Profile URL
            </Text>
            <SearchInput
              value={linkedinUrl}
              onChangeText={setLinkedinUrl}
              placeholder="e.g. https://linkedin.in/in/janesmith"
            />
            <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 10, marginBottom: 4 }]}>
              Twitter / X Handle or URL
            </Text>
            <SearchInput
              value={twitterUrl}
              onChangeText={setTwitterUrl}
              placeholder="e.g. @janesmith or https://x.com/janesmith"
            />
          </View>

          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Designation / Job Title *
          </Text>
          <SearchInput
            value={designationName}
            onChangeText={setDesignationName}
            placeholder="e.g. Senior Software Engineer, HR Specialist..."
          />

          {/* Promotion toggle if designation changed */}
          {designationName.trim() !== (user.designation?.name || '') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: theme.colors.brand.primaryLight }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                  🚀 Record as Official Promotion
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>
                  Log as an official career advancement on the timeline history
                </Text>
              </View>
              <Switch
                value={isPromotion}
                onValueChange={setIsPromotion}
                trackColor={{ false: theme.colors.surface.border, true: theme.colors.brand.primary }}
              />
            </View>
          )}

          {/* ── Role Change ── */}
          {canChangeRole && assignableRoles.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppIcon name="employees" color={theme.colors.brand.primary} size={16} />
                <Text style={[typography.label, { color: theme.colors.text.primary, marginLeft: 6 }]}>
                  Permission Role
                </Text>
              </View>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 10 }]}>
                Current:{' '}
                <Text style={{ fontWeight: '700', color: theme.colors.brand.primary }}>
                  {ROLE_DISPLAY_LABELS[user.role as UserRole] || user.role}
                </Text>
              </Text>

              <View style={styles.chipRow}>
                {assignableRoles.map((role) => {
                  const isSelected = selectedRole === role;
                  const isCurrent = role === (user.role as UserRole);
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        {
                          borderColor: isSelected
                            ? theme.colors.brand.primary
                            : theme.colors.surface.border,
                          backgroundColor: isSelected
                            ? theme.colors.brand.primaryLight
                            : theme.colors.surface.card,
                        },
                      ]}
                      onPress={() => handleRoleChange(role)}
                    >
                      <Text style={[
                        typography.caption,
                        {
                          color: isSelected ? theme.colors.brand.primary : theme.colors.text.primary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}>
                        {ROLE_DISPLAY_LABELS[role] || role}
                        {isCurrent ? ' ✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Reporting To (Supervisor) ── */}
          {canEditSupervisor && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppIcon name="employees" color={theme.colors.brand.primary} size={16} />
                <Text style={[typography.label, { color: theme.colors.text.primary, marginLeft: 6 }]}>
                  Reporting To (Supervisor)
                </Text>
              </View>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 10 }]}>
                Currently:{' '}
                <Text style={{
                  fontWeight: '700',
                  color: user.manager?.name
                    ? theme.colors.brand.primary
                    : theme.colors.semantic.warning,
                }}>
                  {user.manager?.name ?? 'Unassigned'}
                </Text>
              </Text>

              {/* Server-side search */}
              <SearchInput
                value={supervisorSearch}
                onChangeText={handleSupervisorSearch}
                placeholder="Search by name, ID or email..."
              />

              <View style={{ marginTop: 8, gap: 6 }}>
                {/* Unassign option */}
                <TouchableOpacity
                  style={[
                    styles.supervisorItem,
                    {
                      borderColor:
                        supervisorTouched && selectedSupervisorId === null
                          ? theme.colors.brand.primary
                          : theme.colors.surface.border,
                    },
                    supervisorTouched && selectedSupervisorId === null && {
                      backgroundColor: theme.colors.brand.primaryLight,
                    },
                  ]}
                  onPress={() => handleSelectSupervisor(null)}
                >
                  <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                    Unassigned (Company Pool)
                  </Text>
                </TouchableOpacity>

                {/* Self-assign shortcut */}
                {permissions.user &&
                  supervisors.some((s) => s.id === permissions.user!.id) && (
                  <TouchableOpacity
                    style={[
                      styles.supervisorItem,
                      {
                        borderColor:
                          selectedSupervisorId === permissions.user.id
                            ? theme.colors.brand.primary
                            : theme.colors.surface.border,
                        borderStyle: 'dashed',
                      },
                      selectedSupervisorId === permissions.user.id && {
                        backgroundColor: theme.colors.brand.primaryLight,
                      },
                    ]}
                    onPress={() => handleSelectSupervisor(permissions.user!.id)}
                  >
                    <Text style={[typography.bodySm, {
                      color: theme.colors.brand.primary,
                      fontWeight: '700',
                    }]}>
                      ★ Assign to myself ({permissions.user.name})
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Results */}
                {loadingSupervisors || isFetching ? (
                  <LoadingState message="Searching supervisors..." />
                ) : supervisors.length === 0 && debouncedSearch ? (
                  <Text style={[typography.caption, {
                    color: theme.colors.text.secondary,
                    textAlign: 'center',
                    paddingVertical: 12,
                  }]}>
                    No supervisors found for "{debouncedSearch}"
                  </Text>
                ) : (
                  supervisors.map((s) => {
                    const isSelected = selectedSupervisorId === s.id;
                    const isCurrent = s.id === user.managerId;
                    const roleLabel = ROLE_DISPLAY_LABELS[s.role as UserRole] || s.role;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.supervisorItem,
                          {
                            borderColor: isSelected
                              ? theme.colors.brand.primary
                              : theme.colors.surface.border,
                          },
                          isSelected && { backgroundColor: theme.colors.brand.primaryLight },
                        ]}
                        onPress={() => handleSelectSupervisor(s.id)}
                      >
                        <View style={styles.supervisorRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.bodySm, {
                              color: theme.colors.text.primary,
                              fontWeight: '600',
                            }]}>
                              {s.name}
                              {permissions.user && s.id === permissions.user.id ? ' (You)' : ''}
                            </Text>
                            <Text style={[typography.caption, {
                              color: theme.colors.text.secondary,
                              marginTop: 1,
                            }]}>
                              {s.employeeId} · {roleLabel}
                            </Text>
                          </View>
                          {isCurrent && !supervisorTouched && (
                            <Text style={[typography.caption, {
                              color: theme.colors.semantic.success,
                              fontWeight: '600',
                            }]}>
                              Current
                            </Text>
                          )}
                          {isSelected && supervisorTouched && (
                            <AppIcon name="success" color={theme.colors.brand.primary} size={16} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* User GPS Tracking Option (For all roles below MASTER_SUPER_ADMIN) */}
          {selectedRole !== UserRole.MASTER_SUPER_ADMIN && (() => {
            const ROLE_RANK_MAP: Record<string, number> = {
              EMPLOYEE: 0,
              MANAGER: 1,
              HR: 2,
              COMPANY_ADMIN: 3,
              SUPER_ADMIN: 4,
              MASTER_SUPER_ADMIN: 5,
            };
            const actorRole = permissions.userRole;
            const actorRank = ROLE_RANK_MAP[actorRole] ?? 0;
            const targetRank = ROLE_RANK_MAP[user.role] ?? 0;
            const isOwnProfile = permissions.user?.id === user.id;
            const canToggleGps = !isCompanyGpsDisabled && !isOwnProfile && actorRank > targetRank;

            return (
              <View style={styles.section}>
                <View style={[styles.gpsToggleCard, { borderColor: theme.colors.surface.border, marginTop: 8 }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                      Record GPS Tracking & Live Map for User?
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                      {isCompanyGpsDisabled
                        ? '⚠️ Disabled because GPS tracking module is not enabled for this company.'
                        : isOwnProfile
                        ? '⚠️ You cannot modify your own GPS tracking settings.'
                        : !canToggleGps
                        ? '⚠️ Only administrators of higher role rank can enable/disable tracking.'
                        : isGpsTracked
                        ? 'Record background GPS routes and display on Live Map.'
                        : 'Simple Punch-In / Punch-Out mode only (No GPS recorded).'}
                    </Text>
                  </View>
                  <Switch
                    value={isCompanyGpsDisabled ? false : (canToggleGps ? isGpsTracked : false)}
                    disabled={!canToggleGps}
                    onValueChange={(val) => {
                      setIsGpsTracked(val);
                      setGpsTouched(true);
                    }}
                    trackColor={{ false: '#CBD5E1', true: theme.colors.brand.primary }}
                  />
                </View>
              </View>
            );
          })()}

          {/* Attendance Policy override (Optional) */}
          {selectedRole !== UserRole.MASTER_SUPER_ADMIN && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppIcon name="attendance" color={theme.colors.brand.primary} size={16} />
                <Text style={[typography.label, { color: theme.colors.text.primary, marginLeft: 6 }]}>
                  Attendance Punch Policy
                </Text>
              </View>
              {loadingPolicies ? (
                <LoadingState message="Loading attendance policies..." />
              ) : (
                <View style={{ gap: 6, marginTop: 8 }}>
                  {/* Default / Unassigned (system default or company default) */}
                  <TouchableOpacity
                    style={[
                      styles.supervisorItem,
                      {
                        borderColor: selectedAttendancePolicyId === null
                          ? theme.colors.brand.primary
                          : theme.colors.surface.border,
                      },
                      selectedAttendancePolicyId === null && { backgroundColor: theme.colors.brand.primaryLight },
                    ]}
                    onPress={() => {
                      setSelectedAttendancePolicyId(null);
                      setPolicyTouched(true);
                    }}
                  >
                    <View style={styles.supervisorRow}>
                      <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                        {'Inherit Default (Designation > Department > Company Default)'}
                      </Text>
                      {user.attendancePolicyId === null && !policyTouched && (
                        <Text style={[typography.caption, { color: theme.colors.semantic.success, fontWeight: '600', marginLeft: 'auto' }]}>
                          Current
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* All custom policies */}
                  {policies.map((p) => {
                    const isSelected = selectedAttendancePolicyId === p.id;
                    const isCurrent = user.attendancePolicyId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.supervisorItem,
                          {
                            borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                          },
                          isSelected && { backgroundColor: theme.colors.brand.primaryLight },
                        ]}
                        onPress={() => {
                          setSelectedAttendancePolicyId(p.id);
                          setPolicyTouched(true);
                        }}
                      >
                        <View style={styles.supervisorRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                              {p.name}
                            </Text>
                            {p.description ? (
                              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
                                {p.description}
                              </Text>
                            ) : null}
                          </View>
                          {isCurrent && !policyTouched && (
                            <Text style={[typography.caption, { color: theme.colors.semantic.success, fontWeight: '600' }]}>
                              Current
                            </Text>
                          )}
                          {isSelected && policyTouched && (
                            <AppIcon name="success" color={theme.colors.brand.primary} size={16} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <Button
            label="Save Changes"
            variant="primary"
            size="lg"
            onPress={handleSave}
            loading={updateMutation.isPending}
            fullWidth
            style={{ marginTop: 24 }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  formCard: { marginTop: 16, padding: 16 },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  supervisorItem: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
  supervisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
});

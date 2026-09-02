import React, { useState } from 'react';
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
import { useSupervisors, useCreateUser } from '../hooks/useUserManagement';
import { useCompanies } from '../../companies/hooks/useCompanies';
import { useBranches, useDepartments } from '../../organization/hooks/useOrganization';
import { useAttendancePolicies } from '../../attendance/hooks/useAttendance';
import { ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';

export function AddUserScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const permissions = usePermissions();
  const actorUser = permissions.user;
  const createUserMutation = useCreateUser();
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  // Check if selected company is the platform company (NetroTrack, code 'NETRO')
  const availableRoles: UserRole[] = permissions.creatableRoles;
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || (companies.length === 1 ? companies[0] : null);
  const isCompanyGpsDisabled = selectedCompany
    ? !selectedCompany.modules?.some((m: any) => m.module === 'GPS' && m.isEnabled)
    : false;

  const isPlatformCompany = selectedCompany
    ? (selectedCompany.code === 'NETRO' || selectedCompany.name.toLowerCase().includes('netro'))
    : (!permissions.isSuperAdmin ? (permissions.user?.companyName?.toLowerCase().includes('netro') ?? false) : true);

  // Super Admin & Master Super Admin are ONLY allowed for the platform company (NetroTrack).
  // For tenant companies (e.g. Infobell), restrict available roles to tenant roles.
  const displayedRoles = availableRoles.filter((role: UserRole) => {
    if (!isPlatformCompany && (role === UserRole.SUPER_ADMIN || role === UserRole.MASTER_SUPER_ADMIN)) {
      return false;
    }
    return true;
  });

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    displayedRoles[0] || UserRole.COMPANY_ADMIN
  );
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string | null>(null);
  const [isGpsTracked, setIsGpsTracked] = useState(true);
  const [designationName, setDesignationName] = useState('');
  const [selectedAttendancePolicyId, setSelectedAttendancePolicyId] = useState<string | null>(null);

  const { data: policiesData = [], isLoading: policiesLoading } = useAttendancePolicies(selectedCompanyId || undefined, 'ATTENDANCE');
  const { data: branchesData = [], isLoading: branchesLoading } = useBranches(selectedCompanyId || undefined);
  const { data: departmentsData = [], isLoading: departmentsLoading } = useDepartments(selectedCompanyId || undefined);

  // Auto-switch selectedRole if current role is invalid for selected tenant company
  React.useEffect(() => {
    if (!isPlatformCompany && (selectedRole === UserRole.SUPER_ADMIN || selectedRole === UserRole.MASTER_SUPER_ADMIN)) {
      const fallbackRole = displayedRoles[0] || UserRole.COMPANY_ADMIN;
      setSelectedRole(fallbackRole);
    }
  }, [selectedCompanyId, isPlatformCompany, selectedRole, displayedRoles]);

  // Auto-enable GPS tracking when a policy with GPS REQUIRED/OPTIONAL is selected
  React.useEffect(() => {
    if (!selectedAttendancePolicyId) return;
    const selectedPolicy = policiesData.find((p) => p.id === selectedAttendancePolicyId);
    if (!selectedPolicy) return;
    const punchInGps: string | undefined = selectedPolicy.punchInConfig?.gps;
    if (punchInGps === 'REQUIRED' || punchInGps === 'OPTIONAL') {
      setIsGpsTracked(true);
    }
  }, [selectedAttendancePolicyId, policiesData]);

  // Roles that need a supervisor picker (everything below Company Admin)
  const needsSupervisor = selectedRole === UserRole.EMPLOYEE ||
    selectedRole === UserRole.MANAGER ||
    selectedRole === UserRole.HR;

  // Fetch supervisors for the selected role — only when a supervisor picker is shown
  const { data: supervisors = [], isLoading: loadingSupervisors } = useSupervisors(
    needsSupervisor ? selectedRole : '',
    undefined,
    permissions.isSuperAdmin ? (selectedCompanyId ?? undefined) : undefined
  );

  // Reset supervisor selection whenever role changes
  React.useEffect(() => {
    setSelectedSupervisorId(null);
  }, [selectedRole]);

  const handleCreate = async () => {
    if (!employeeId.trim()) {
      Alert.alert('Validation Error', 'Employee ID is required');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full Name is required');
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
      Alert.alert('Validation Error', 'Emergency Contact Name is required');
      return;
    }
    if (!emergencyContactPhone.trim()) {
      Alert.alert('Validation Error', 'Emergency Contact Phone Number is required');
      return;
    }
    if (permissions.isSuperAdmin && !selectedCompanyId && selectedRole !== UserRole.MASTER_SUPER_ADMIN) {
      Alert.alert('Validation Error', 'Please select a company for this user');
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        employeeId: employeeId.trim(),
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
        password: password.trim() || undefined,
        role: selectedRole,
        designationName: designationName.trim(),
        companyId: permissions.isSuperAdmin ? selectedCompanyId : undefined,
        departmentId: departmentId || undefined,
        branchId: branchId || undefined,
        isGpsTracked: isCompanyGpsDisabled ? false : isGpsTracked,
        managerId: needsSupervisor ? (selectedSupervisorId ?? null) : undefined,
        attendancePolicyId: selectedRole !== UserRole.MASTER_SUPER_ADMIN ? selectedAttendancePolicyId : null,
      });

      Alert.alert('Success', `User ${name} created successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to create user');
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Add New User"
          subtitle="Provision new account & assign role hierarchy"
        />

        <Card variant="elevated" style={styles.formCard}>
          <Text style={[typography.headingSm, { color: theme.colors.brand.primary, marginBottom: 12 }]}>
            💼 Professional Identity
          </Text>

          <Text style={[typography.label, { color: theme.colors.text.primary }]}>
            Organization & Assignment
          </Text>

          <View style={{ marginTop: 14 }}>
            <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
              Department
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
              {departmentsLoading ? (
                <Text style={{ padding: 12 }}>Loading departments...</Text>
              ) : (
                <Picker
                  selectedValue={departmentId}
                  onValueChange={(val: any) => setDepartmentId(val)}
                >
                  <Picker.Item label="Select Department (Optional)" value="" />
                  {departmentsData?.map((dept: any) => (
                    <Picker.Item key={dept.id} label={dept.name} value={dept.id} />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
              Branch
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.border }]}>
              {branchesLoading ? (
                <Text style={{ padding: 12 }}>Loading branches...</Text>
              ) : (
                <Picker
                  selectedValue={branchId}
                  onValueChange={(val: any) => setBranchId(val)}
                >
                  <Picker.Item label="Select Branch (Optional)" value="" />
                  {branchesData?.map((b: any) => (
                    <Picker.Item key={b.id} label={b.name} value={b.id} />
                  ))}
                </Picker>
              )}
            </View>
          </View>

          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Employee ID / Login Code *
          </Text>
          <SearchInput
            value={employeeId}
            onChangeText={setEmployeeId}
            placeholder="e.g. EMP005 or MGR003"
          />

          {/* Full Name */}
          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Full Name *
          </Text>
          <SearchInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jane Smith"
          />

          {/* Designation / Job Title (Mandatory) */}
          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Designation / Job Title *
          </Text>
          <SearchInput
            value={designationName}
            onChangeText={setDesignationName}
            placeholder="e.g. Senior Software Engineer, HR Manager..."
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {[
              'Software Engineer',
              'Senior Software Engineer',
              'Sales Executive',
              'Operations Manager',
              'Field Agent',
              'HR Executive',
              'Technical Lead',
            ].map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.roleChip,
                  {
                    borderColor: designationName === preset ? theme.colors.brand.primary : theme.colors.surface.border,
                    backgroundColor: designationName === preset ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                    marginRight: 6,
                  },
                ]}
                onPress={() => setDesignationName(preset)}
              >
                <Text style={[typography.caption, { color: theme.colors.text.primary, fontWeight: designationName === preset ? '700' : '400' }]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Work / Official Email (Mandatory) */}
          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Official Work Email *
          </Text>
          <SearchInput
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. jane.smith@company.com"
          />

          {/* Personal Email (Optional) */}
          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Personal Email (Optional)
          </Text>
          <SearchInput
            value={personalEmail}
            onChangeText={setPersonalEmail}
            placeholder="e.g. jane.personal@gmail.com"
          />

          {/* Primary Mobile Number (Mandatory, with Country Code selector) */}
          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Primary Mobile Number *
          </Text>
          <PhoneInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter 10-digit primary mobile"
          />

          {/* Secondary Phone (Optional, with Country Code selector) */}
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

          {/* Emergency Contact Information (Mandatory) */}
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

          {/* Password */}
          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 14 }]}>
            Password (Optional, default: Password123!)
          </Text>
          <SearchInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter custom password..."
          />

          {/* Company Selection (For Super Admin & Master Super Admin) */}
          {permissions.isSuperAdmin && selectedRole !== UserRole.MASTER_SUPER_ADMIN && (
            <View style={{ marginTop: 16 }}>
              <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 6 }]}>
                Target Tenant Company *
              </Text>
              {loadingCompanies ? (
                <LoadingState message="Loading companies..." />
              ) : companies.length === 0 ? (
                <Text style={[typography.caption, { color: theme.colors.semantic.error }]}>
                  No companies available. Please register a company first.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {companies.map((c) => {
                    const isSelected = selectedCompanyId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.companySelectItem,
                          { borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border },
                          isSelected && { backgroundColor: theme.colors.brand.primaryLight },
                        ]}
                        onPress={() => setSelectedCompanyId(c.id)}
                      >
                        <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                          {c.name} [{c.code}]
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Role Selection */}
          <Text style={[typography.label, { color: theme.colors.text.primary, marginTop: 16, marginBottom: 8 }]}>
            System Access Role *
          </Text>
          <View style={styles.rolePickerRow}>
            {displayedRoles.map((role) => {
              const isSelected = selectedRole === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                      backgroundColor: isSelected ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                    },
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? theme.colors.brand.primary : theme.colors.text.primary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {ROLE_DISPLAY_LABELS[role] || role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* User GPS Tracking Option (For all roles below MASTER_SUPER_ADMIN) */}
          {selectedRole !== UserRole.MASTER_SUPER_ADMIN && (() => {
            const ROLE_RANK_MAP: Record<UserRole, number> = {
              [UserRole.EMPLOYEE]: 0,
              [UserRole.MANAGER]: 1,
              [UserRole.HR]: 2,
              [UserRole.COMPANY_ADMIN]: 3,
              [UserRole.SUPER_ADMIN]: 4,
              [UserRole.MASTER_SUPER_ADMIN]: 5,
            };
            const actorRole = actorUser?.role as UserRole;
            const actorRank = ROLE_RANK_MAP[actorRole] ?? 0;
            const targetRank = ROLE_RANK_MAP[selectedRole] ?? 0;
            const canToggleGps = !isCompanyGpsDisabled && actorRank > targetRank;

            return (
              <View style={[styles.gpsToggleCard, { borderColor: theme.colors.surface.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                    Record GPS Tracking & Live Map for User?
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                    {isCompanyGpsDisabled
                      ? '⚠️ Disabled because GPS tracking module is not enabled for this company.'
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
                  onValueChange={setIsGpsTracked}
                  trackColor={{ false: '#CBD5E1', true: theme.colors.brand.primary }}
                />
              </View>
            );
          })()}

          {/* Attendance Policy override (Optional) */}
          {selectedRole !== UserRole.MASTER_SUPER_ADMIN && (
            <View style={{ marginTop: 16 }}>
              <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 6 }]}>
                Attendance Punch Policy (Optional Override)
              </Text>
              {loadingPolicies ? (
                <LoadingState message="Loading attendance policies..." />
              ) : (
                <View style={{ gap: 6 }}>
                  {/* Default / Unassigned (system default or company default) */}
                  <TouchableOpacity
                    style={[
                      styles.managerItem,
                      {
                        borderColor: selectedAttendancePolicyId === null
                          ? theme.colors.brand.primary
                          : theme.colors.surface.border,
                      },
                      selectedAttendancePolicyId === null && { backgroundColor: theme.colors.brand.primaryLight },
                    ]}
                    onPress={() => setSelectedAttendancePolicyId(null)}
                  >
                    <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                      {'Inherit Default (Designation > Department > Company Default)'}
                    </Text>
                  </TouchableOpacity>

                  {/* All custom policies */}
                  {policies.map((p) => {
                    const isSelected = selectedAttendancePolicyId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.managerItem,
                          {
                            borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                          },
                          isSelected && { backgroundColor: theme.colors.brand.primaryLight },
                        ]}
                        onPress={() => setSelectedAttendancePolicyId(p.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                            {p.name}
                          </Text>
                          {p.description ? (
                            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                              {p.description}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Supervisor / Reporting-To Assignment */}
          {needsSupervisor && (
            <View style={{ marginTop: 16 }}>
              <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 6 }]}>
                Reporting To (Supervisor)
              </Text>

              {permissions.isManager ? (
                /* Manager creating Employee: auto-assigned to self */
                <Card variant="outlined" style={styles.autoAssignNotice}>
                  <AppIcon name="employees" color={theme.colors.brand.primary} size={20} />
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginLeft: 8, flex: 1 }]}>
                    As a Manager, this employee will be automatically assigned to your team.
                  </Text>
                </Card>
              ) : loadingSupervisors ? (
                <LoadingState message="Loading supervisors..." />
              ) : (
                <View style={{ gap: 6 }}>
                  {/* Unassigned option */}
                  <TouchableOpacity
                    style={[
                      styles.managerItem,
                      {
                        borderColor: selectedSupervisorId === null
                          ? theme.colors.brand.primary
                          : theme.colors.surface.border,
                      },
                      selectedSupervisorId === null && { backgroundColor: theme.colors.brand.primaryLight },
                    ]}
                    onPress={() => setSelectedSupervisorId(null)}
                  >
                    <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]}>
                      Unassigned (Company Pool)
                    </Text>
                  </TouchableOpacity>

                  {/* "Assign to myself" shortcut when actor rank > target role rank */}
                  {actorUser && supervisors.some((s) => s.id === actorUser.id) && (
                    <TouchableOpacity
                      style={[
                        styles.managerItem,
                        {
                          borderColor: selectedSupervisorId === actorUser.id
                            ? theme.colors.brand.primary
                            : theme.colors.surface.border,
                          borderStyle: 'dashed',
                        },
                        selectedSupervisorId === actorUser.id && { backgroundColor: theme.colors.brand.primaryLight },
                      ]}
                      onPress={() => setSelectedSupervisorId(actorUser.id)}
                    >
                      <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                        ★ Assign to myself ({actorUser.name})
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* All eligible supervisors */}
                  {supervisors.map((s) => {
                    const isSelected = selectedSupervisorId === s.id;
                    const roleLabel = ROLE_DISPLAY_LABELS[s.role as UserRole] || s.role;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.managerItem,
                          { borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border },
                          isSelected && { backgroundColor: theme.colors.brand.primaryLight },
                        ]}
                        onPress={() => setSelectedSupervisorId(s.id)}
                      >
                        <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                          {s.name}
                          {s.id === actorUser?.id ? ' (You)' : ''}
                        </Text>
                        <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 1 }]}>
                          {s.employeeId} · {roleLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Submit Action */}
          <Button
            label="Create User"
            variant="primary"
            size="lg"
            onPress={handleCreate}
            loading={createUserMutation.isPending}
            fullWidth
            style={{ marginTop: 24 }}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  formCard: {
    marginTop: 16,
    padding: 16,
  },
  rolePickerRow: {
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
  gpsToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  managerItem: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
  companySelectItem: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 10,
  },
  autoAssignNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
});

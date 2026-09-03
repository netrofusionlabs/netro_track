import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
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
import { useAccessGroups } from '../../authorization/hooks/useAccessGroups';
import { ROLE_DISPLAY_LABELS, UserRole } from '@netrotrack/shared';

export function AddUserScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const permissions = usePermissions();
  const actorUser = permissions.user;
  const createUserMutation = useCreateUser();
  const { data: companies = [], isLoading: loadingCompanies } = useCompanies();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  // Auto-initialize selectedCompanyId for Super Admins
  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      const defaultCompany = companies.find((c) => c.id === actorUser?.companyId) || companies[0];
      if (defaultCompany) {
        setSelectedCompanyId(defaultCompany.id);
      }
    }
  }, [companies, selectedCompanyId, actorUser?.companyId]);

  const handleSelectCompany = (comp: any) => {
    setSelectedCompanyId(comp.id);
    setDepartmentId('');
    setBranchId('');
    setSelectedAttendancePolicyId(null);
    setCompanyModalVisible(false);
  };

  const filteredCompanies = companies.filter((c) => {
    if (!companySearchQuery.trim()) return true;
    const q = companySearchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.officialEmail && c.officialEmail.toLowerCase().includes(q))
    );
  });

  // Check if selected company is the platform company (NetroTrack, code 'NETRO')
  const availableRoles: UserRole[] = permissions.creatableRoles;
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || (companies.length === 1 ? companies[0] : null);

  const isPlatformCompany = selectedCompany
    ? (selectedCompany.code === 'NETRO' || selectedCompany.name.toLowerCase().includes('netro'))
    : (!permissions.isSuperAdmin ? (permissions.user?.companyName?.toLowerCase().includes('netro') ?? false) : true);

  // Gated by company dynamic platform capabilities
  const userEntitledSlugs = permissions.user?.companyEntitledSlugs;
  const userRole = permissions.user?.role;
  const isCompanyAdminOrHigher = userRole === 'COMPANY_ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'MASTER_SUPER_ADMIN';

  const hasGpsTrackingCapability = selectedCompany
    ? (
        isPlatformCompany ||
        ((selectedCompany as any).entitledSlugs?.includes('attendance.punchin_punchout.gps_tracking')) ||
        ((selectedCompany as any).entitlements?.some((e: any) => e.isEnabled && e.capability?.slug === 'attendance.punchin_punchout.gps_tracking')) ||
        (selectedCompany.modules?.some((m: any) => (m.module === 'GPS' || m.code === 'GPS') && m.isEnabled)) ||
        selectedCompany.isGpsEnabled === true
      )
    : (
        isPlatformCompany ||
        (userEntitledSlugs && userEntitledSlugs.length > 0
          ? (
              userEntitledSlugs.includes('attendance.punchin_punchout.gps_tracking') ||
              userEntitledSlugs.includes('attendance.punchin_punchout') ||
              userEntitledSlugs.includes('attendance')
            )
          : (
              isCompanyAdminOrHigher ||
              (permissions.user?.permissions?.includes('attendance.punchin_punchout.gps_tracking') ?? true)
            ))
      );

  const hasCustomPolicyCapability = selectedCompany
    ? (
        isPlatformCompany ||
        ((selectedCompany as any).entitledSlugs?.some((s: string) => s === 'custom_policy_management' || s.startsWith('custom_policy_management.'))) ||
        ((selectedCompany as any).entitlements?.some((e: any) => e.isEnabled && (e.capability?.slug === 'custom_policy_management' || e.capability?.slug?.startsWith('custom_policy_management.')))) ||
        (permissions.user?.permissions?.some((s: string) => s === 'custom_policy_management' || s.startsWith('custom_policy_management.')))
      )
    : (
        isPlatformCompany ||
        (userEntitledSlugs && userEntitledSlugs.length > 0
          ? userEntitledSlugs.some((s: string) => s === 'custom_policy_management' || s.startsWith('custom_policy_management.'))
          : (
              isCompanyAdminOrHigher ||
              (permissions.user?.permissions?.some((s: string) => s === 'custom_policy_management' || s.startsWith('custom_policy_management.')) ?? false)
            ))
      );

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
  const [isGpsTracked, setIsGpsTracked] = useState(hasGpsTrackingCapability);
  const [designationName, setDesignationName] = useState('');
  const [selectedAttendancePolicyId, setSelectedAttendancePolicyId] = useState<string | null>(null);
  const [selectedAccessGroupIds, setSelectedAccessGroupIds] = useState<string[]>([]);

  const { data: policiesData = [], isLoading: policiesLoading } = useAttendancePolicies(
    hasCustomPolicyCapability ? (selectedCompanyId || undefined) : undefined,
    'ATTENDANCE'
  );
  const { data: branchesData = [], isLoading: branchesLoading } = useBranches(selectedCompanyId || undefined);
  const { data: departmentsData = [], isLoading: departmentsLoading } = useDepartments(selectedCompanyId || undefined);
  const { data: accessGroups = [], isLoading: accessGroupsLoading } = useAccessGroups(
    permissions.isSuperAdmin ? (selectedCompanyId || undefined) : undefined
  );

  const toggleAccessGroup = (id: string) => {
    setSelectedAccessGroupIds((prev) =>
      prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id]
    );
  };

  // Auto-switch selectedRole if current role is invalid for selected tenant company
  React.useEffect(() => {
    if (!isPlatformCompany && (selectedRole === UserRole.SUPER_ADMIN || selectedRole === UserRole.MASTER_SUPER_ADMIN)) {
      const fallbackRole = displayedRoles[0] || UserRole.COMPANY_ADMIN;
      setSelectedRole(fallbackRole);
    }
  }, [selectedCompanyId, isPlatformCompany, selectedRole, displayedRoles]);

  // Sync GPS state when capability changes
  React.useEffect(() => {
    if (!hasGpsTrackingCapability) {
      setIsGpsTracked(false);
    } else {
      setIsGpsTracked(true);
    }
  }, [hasGpsTrackingCapability]);

  // Sync Attendance Policy state when custom policy capability changes
  React.useEffect(() => {
    if (!hasCustomPolicyCapability) {
      setSelectedAttendancePolicyId(null);
    }
  }, [hasCustomPolicyCapability]);

  // Auto-enable GPS tracking when a policy with GPS REQUIRED/OPTIONAL is selected
  React.useEffect(() => {
    if (!hasGpsTrackingCapability || !selectedAttendancePolicyId) return;
    const selectedPolicy = policiesData.find((p) => p.id === selectedAttendancePolicyId);
    if (!selectedPolicy) return;
    const punchInGps: string | undefined = selectedPolicy.punchInConfig?.gps;
    if (punchInGps === 'REQUIRED' || punchInGps === 'OPTIONAL') {
      setIsGpsTracked(true);
    }
  }, [selectedAttendancePolicyId, policiesData, hasGpsTrackingCapability]);

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
        isGpsTracked: hasGpsTrackingCapability ? isGpsTracked : false,
        managerId: needsSupervisor ? (selectedSupervisorId ?? null) : undefined,
        attendancePolicyId: (hasCustomPolicyCapability && selectedRole !== UserRole.MASTER_SUPER_ADMIN) ? selectedAttendancePolicyId : null,
        accessGroupIds: selectedAccessGroupIds.length > 0 ? selectedAccessGroupIds : undefined,
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

          {/* Super Admin / Master Super Admin: Target Tenant Company Selector */}
          {permissions.isSuperAdmin && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 6 }]}>
                Target Tenant Company *
              </Text>
              
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.companySelectorTrigger,
                  {
                    borderColor: selectedCompanyId ? theme.colors.brand.primary : theme.colors.surface.border,
                    backgroundColor: theme.colors.surface.card,
                  },
                ]}
                onPress={() => setCompanyModalVisible(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.companyIconBox, { backgroundColor: theme.colors.brand.primaryLight }]}>
                    <AppIcon name="building" size={18} color={theme.colors.brand.primary} />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '600' }]} numberOfLines={1}>
                      {selectedCompany ? selectedCompany.name : 'Select Tenant Company...'}
                    </Text>
                    {selectedCompany && (
                      <Text style={[typography.caption, { fontFamily: 'monospace', color: theme.colors.text.tertiary, marginTop: 1 }]}>
                        Code: {selectedCompany.code} {selectedCompany.industry ? `• ${selectedCompany.industry}` : ''}
                      </Text>
                    )}
                  </View>
                </View>
                <AppIcon name="chevron-down" size={18} color={theme.colors.text.tertiary} />
              </TouchableOpacity>

              {/* Quick 1-Tap Switching Chips */}
              {companies.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {companies.map((c) => {
                    const isSelected = selectedCompanyId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.roleChip,
                          {
                            borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                            backgroundColor: isSelected ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                            marginRight: 6,
                          },
                        ]}
                        onPress={() => handleSelectCompany(c)}
                      >
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: isSelected ? theme.colors.brand.primary : theme.colors.text.primary,
                              fontWeight: isSelected ? '700' : '400',
                            },
                          ]}
                        >
                          {c.name} [{c.code}]
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          <Text style={[typography.label, { color: theme.colors.text.primary }]}>
            Organization & Assignment
          </Text>

          <View style={{ marginTop: 14 }}>
            <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
              Department
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[
                  styles.roleChip,
                  {
                    borderColor: !departmentId ? theme.colors.brand.primary : theme.colors.surface.border,
                    backgroundColor: !departmentId ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                    marginRight: 6,
                  },
                ]}
                onPress={() => setDepartmentId('')}
              >
                <Text style={[typography.caption, { color: theme.colors.text.primary, fontWeight: !departmentId ? '700' : '400' }]}>
                  None
                </Text>
              </TouchableOpacity>
              {departmentsData?.map((dept: any) => (
                <TouchableOpacity
                  key={dept.id}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: departmentId === dept.id ? theme.colors.brand.primary : theme.colors.surface.border,
                      backgroundColor: departmentId === dept.id ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                      marginRight: 6,
                    },
                  ]}
                  onPress={() => setDepartmentId(dept.id)}
                >
                  <Text style={[typography.caption, { color: theme.colors.text.primary, fontWeight: departmentId === dept.id ? '700' : '400' }]}>
                    {dept.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 4 }]}>
              Branch
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[
                  styles.roleChip,
                  {
                    borderColor: !branchId ? theme.colors.brand.primary : theme.colors.surface.border,
                    backgroundColor: !branchId ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                    marginRight: 6,
                  },
                ]}
                onPress={() => setBranchId('')}
              >
                <Text style={[typography.caption, { color: theme.colors.text.primary, fontWeight: !branchId ? '700' : '400' }]}>
                  None
                </Text>
              </TouchableOpacity>
              {branchesData?.map((b: any) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: branchId === b.id ? theme.colors.brand.primary : theme.colors.surface.border,
                      backgroundColor: branchId === b.id ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                      marginRight: 6,
                    },
                  ]}
                  onPress={() => setBranchId(b.id)}
                >
                  <Text style={[typography.caption, { color: theme.colors.text.primary, fontWeight: branchId === b.id ? '700' : '400' }]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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

          {/* User GPS Tracking Option (Only shown if company has attendance.punchin_punchout.gps_tracking entitlement) */}
          {hasGpsTrackingCapability && selectedRole !== UserRole.MASTER_SUPER_ADMIN && (() => {
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
            const canToggleGps = actorRank > targetRank;

            return (
              <View style={[styles.gpsToggleCard, { borderColor: theme.colors.surface.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                    Record GPS Tracking & Live Map for User?
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                    {!canToggleGps
                      ? '⚠️ Only administrators of higher role rank can enable/disable tracking.'
                      : isGpsTracked
                      ? 'Record background GPS routes and display on Live Map.'
                      : 'Simple Punch-In / Punch-Out mode only (No GPS recorded).'}
                  </Text>
                </View>
                <Switch
                  value={canToggleGps ? isGpsTracked : false}
                  disabled={!canToggleGps}
                  onValueChange={setIsGpsTracked}
                  trackColor={{ false: '#CBD5E1', true: theme.colors.brand.primary }}
                />
              </View>
            );
          })()}

          {/* Attendance Policy override (Optional, only shown if company has custom_policy_management entitlement) */}
          {hasCustomPolicyCapability && selectedRole !== UserRole.MASTER_SUPER_ADMIN && (
            <View style={{ marginTop: 16 }}>
              <Text style={[typography.label, { color: theme.colors.text.primary, marginBottom: 6 }]}>
                Attendance Punch Policy (Optional Override)
              </Text>
              {policiesLoading ? (
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
                  {policiesData.map((p: any) => {
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

          {/* Access Profiles & Groups (Dynamic Capabilities) */}
          {accessGroups.length > 0 && (
            <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.surface.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[typography.headingSm, { color: theme.colors.brand.primary }]}>
                  🛡️ Access Profiles & Groups
                </Text>
                {selectedAccessGroupIds.length > 0 && (
                  <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '600' }]}>
                    {selectedAccessGroupIds.length} Selected
                  </Text>
                )}
              </View>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 12 }]}>
                Assign custom permission bundles entitled to this organization
              </Text>

              <View style={{ gap: 8 }}>
                {accessGroups.map((g) => {
                  const isSelected = selectedAccessGroupIds.includes(g.id);
                  const permCount = g._count?.permissions ?? 0;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.managerItem,
                        {
                          borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                          backgroundColor: isSelected ? theme.colors.brand.primaryLight : theme.colors.surface.card,
                        },
                      ]}
                      onPress={() => toggleAccessGroup(g.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                              {g.name}
                            </Text>
                            {g.isSystem && (
                              <View style={{ backgroundColor: theme.colors.surface.subtle, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={[typography.caption, { color: theme.colors.text.secondary, fontSize: 10 }]}>SYSTEM</Text>
                              </View>
                            )}
                          </View>
                          {Boolean(g.description) && (
                            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]} numberOfLines={2}>
                              {g.description}
                            </Text>
                          )}
                          <Text style={[typography.caption, { color: theme.colors.brand.primary, marginTop: 4, fontWeight: '500' }]}>
                            ⚡ {permCount} {permCount === 1 ? 'Capability' : 'Capabilities'} Included
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                            backgroundColor: isSelected ? theme.colors.brand.primary : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && <AppIcon name="check" size={14} color="#FFFFFF" />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
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

      {/* Searchable Company Picker Modal for Super Admins */}
      <Modal
        visible={companyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCompanyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[typography.headingMd, { color: theme.colors.text.primary }]}>Select Tenant Company</Text>
                <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>Choose the target organization for this user</Text>
              </View>
              <TouchableOpacity onPress={() => setCompanyModalVisible(false)} style={styles.closeBtn}>
                <AppIcon name="x" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <SearchInput
                value={companySearchQuery}
                onChangeText={setCompanySearchQuery}
                placeholder="Search by company name or code..."
              />
            </View>

            <ScrollView style={{ maxHeight: 380, paddingHorizontal: 16 }}>
              {filteredCompanies.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]}>No companies found</Text>
                </View>
              ) : (
                filteredCompanies.map((c) => {
                  const isSelected = selectedCompanyId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.companyModalItem,
                        {
                          borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                          backgroundColor: isSelected ? theme.colors.brand.primaryLight : theme.colors.surface.subtle,
                        },
                      ]}
                      onPress={() => handleSelectCompany(c)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '600' }]}>{c.name}</Text>
                          <Text style={[typography.caption, { fontFamily: 'monospace', color: theme.colors.text.tertiary }]}>[{c.code}]</Text>
                        </View>
                        {Boolean(c.officialEmail) && (
                          <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>{c.officialEmail}</Text>
                        )}
                      </View>
                      {isSelected && <AppIcon name="check" size={18} color={theme.colors.brand.primary} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  companySelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  companyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  closeBtn: {
    padding: 6,
  },
  companyModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
});

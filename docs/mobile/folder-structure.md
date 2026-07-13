# Mobile Folder Structure

> **Purpose:** Complete directory layout for the React Native application.
> **Dependencies:** [Mobile Overview](mobile-overview.md)

---

```
apps/mobile/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── MpinScreen.tsx
│   │   │   │   ├── MpinSetupScreen.tsx
│   │   │   │   └── BiometricSetupScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── MpinKeypad.tsx
│   │   │   │   └── BiometricPrompt.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLogin.ts
│   │   │   │   ├── useMpin.ts
│   │   │   │   └── useBiometric.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   ├── stores/
│   │   │   │   └── authStore.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── screens/
│   │   │   │   ├── UserDashboard.tsx
│   │   │   │   ├── ManagerDashboard.tsx
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   └── SuperAdminDashboard.tsx
│   │   │   ├── components/
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── AttendanceWidget.tsx
│   │   │   │   ├── ActivitySummary.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   └── hooks/
│   │   │       └── useDashboard.ts
│   │   │
│   │   ├── attendance/
│   │   │   ├── screens/
│   │   │   │   ├── AttendanceScreen.tsx
│   │   │   │   └── AttendanceHistoryScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── PunchButton.tsx
│   │   │   │   ├── WorkingTimer.tsx
│   │   │   │   └── AttendanceCard.tsx
│   │   │   └── hooks/
│   │   │       └── useAttendance.ts
│   │   │
│   │   ├── tracking/
│   │   │   ├── screens/
│   │   │   │   ├── MapScreen.tsx
│   │   │   │   ├── TeamMapScreen.tsx
│   │   │   │   └── RoutePlaybackScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── EmployeeMarker.tsx
│   │   │   │   └── RoutePolyline.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTracking.ts
│   │   │   │   └── useBackgroundLocation.ts
│   │   │   └── services/
│   │   │       ├── tracking.service.ts
│   │   │       ├── gpsBuffer.ts
│   │   │       └── backgroundTask.ts
│   │   │
│   │   ├── visits/
│   │   ├── sales/
│   │   ├── inspections/
│   │   ├── reports/
│   │   ├── profile/
│   │   ├── employees/          (Admin)
│   │   ├── companies/          (Super Admin)
│   │   ├── settings/           (Admin)
│   │   └── notifications/
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Snackbar.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── OfflineBanner.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Divider.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── ImageViewer.tsx
│   │   │   ├── CameraCapture.tsx
│   │   │   └── SkeletonLoader.tsx
│   │   ├── hooks/
│   │   │   ├── useTheme.ts
│   │   │   ├── useNetwork.ts
│   │   │   ├── useLocation.ts
│   │   │   ├── useCamera.ts
│   │   │   ├── useImagePicker.ts
│   │   │   └── usePermissions.ts
│   │   ├── theme/
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── ThemeContext.ts
│   │   │   ├── tokens.ts
│   │   │   ├── lightTheme.ts
│   │   │   ├── darkTheme.ts
│   │   │   └── mapStyles.ts
│   │   ├── services/
│   │   │   ├── api.ts              (Axios instance with interceptors)
│   │   │   ├── storage.ts          (MMKV wrapper)
│   │   │   └── syncEngine.ts       (Offline sync engine)
│   │   ├── utils/
│   │   │   ├── dateUtils.ts
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── permissions.ts
│   │   │   └── imageUtils.ts
│   │   ├── stores/
│   │   │   ├── themeStore.ts
│   │   │   └── syncStore.ts
│   │   └── types/
│   │       ├── api.types.ts
│   │       └── navigation.types.ts
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── UserTabNavigator.tsx
│   │   ├── ManagerTabNavigator.tsx
│   │   ├── AdminTabNavigator.tsx
│   │   ├── SuperAdminTabNavigator.tsx
│   │   └── linking.ts             (Deep linking config)
│   │
│   └── App.tsx
│
├── android/                        (Android native project)
├── ios/                            (iOS native project)
├── __tests__/                      (Test files)
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── react-native.config.js
└── package.json
```

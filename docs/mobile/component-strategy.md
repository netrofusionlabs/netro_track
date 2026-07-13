# Component Strategy

> **Purpose:** Define the reusable component library.
> **Dependencies:** [Design System](../design-system/design-system-overview.md)

---

## Component Categories

### Foundation
| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | variant, size, loading, disabled, icon | Primary, secondary, outline, ghost, danger |
| `Input` | label, error, icon, type, multiline | Text input with validation |
| `Select` | options, value, onChange, label | Dropdown picker |
| `Card` | variant, onPress, elevated | Content container |
| `Badge` | count, variant, size | Notification/status badge |
| `Avatar` | imageUrl, name, size | User profile image |
| `Divider` | orientation, spacing | Visual separator |
| `Icon` | name, size, color | Icon wrapper |

### Feedback
| Component | Props | Description |
|-----------|-------|-------------|
| `Snackbar` | message, action, duration | Toast notification |
| `BottomSheet` | children, snapPoints | Modal bottom sheet |
| `Modal` | title, children, visible | Full dialog |
| `LoadingState` | message | Full-screen loading |
| `EmptyState` | icon, title, message, action | No data placeholder |
| `ErrorState` | message, onRetry | Error with retry |
| `SkeletonLoader` | layout | Shimmer placeholder |
| `OfflineBanner` | pendingCount | Connectivity warning |

### Data Display
| Component | Props | Description |
|-----------|-------|-------------|
| `StatCard` | label, value, icon, trend | Dashboard metric |
| `AttendanceCard` | status, punchIn, hours | Attendance display |
| `EmployeeCard` | employee, onPress | Team member row |
| `VisitCard` | visit, onPress | Visit summary |
| `SaleCard` | sale, onPress | Sale summary |
| `InspectionCard` | inspection, onPress | Inspection summary |
| `NotificationItem` | notification, onPress | Notification row |
| `Timeline` | items | Activity timeline |
| `DatePicker` | value, onChange, mode | Date selection |
| `DateRangePicker` | startDate, endDate | Date range filter |

### Maps & Location
| Component | Props | Description |
|-----------|-------|-------------|
| `MapView` | initialRegion, markers | Google Maps wrapper |
| `EmployeeMarker` | employee, status | Map marker for employee |
| `RoutePolyline` | points, color | GPS route line |
| `LocationPin` | lat, lng, label | Single location marker |

### Media
| Component | Props | Description |
|-----------|-------|-------------|
| `CameraCapture` | onCapture, mode | Camera with capture |
| `ImageViewer` | images, initialIndex | Full-screen image gallery |
| `ImageGrid` | images, onAdd, maxCount | Photo grid with add button |

### Forms
| Component | Props | Description |
|-----------|-------|-------------|
| `FormField` | label, error, children | Form field wrapper |
| `SearchInput` | value, onChange, placeholder | Search with debounce |
| `CustomerPicker` | companyId, onSelect | Customer search and select |
| `ProductPicker` | companyId, onSelect | Product search and select |
| `MpinKeypad` | length, onComplete | Numeric PIN input |

---

## Component Rules

1. All components consume theme tokens via `useTheme()` — no hardcoded colors.
2. Components are **presentational** — no API calls or business logic.
3. Components accept all data via props — no internal data fetching.
4. Consistent `testID` prop for every interactive element.
5. All components support both light and dark themes.
